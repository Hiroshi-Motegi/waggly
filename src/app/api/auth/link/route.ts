import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/auth/link
 * Link current account with another provider.
 */
export async function POST(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();

  const body = await request.json();
  const { provider, originalUserId } = body;
  let { providerId } = body;

  const targetUserId = originalUserId || auth.userId;

  console.log("[link] POST:", { provider, providerId: providerId?.substring?.(0, 10), authUserId: auth.userId, targetUserId, hasOriginalUserId: !!originalUserId });

  if (!provider) {
    return NextResponse.json({ error: "Missing provider" }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  // For LINE linking via OAuth code, resolve LINE user ID
  if (provider === "line" && !providerId && body.code) {
    const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: body.code,
        redirect_uri: body.redirectUri,
        client_id: process.env.NEXT_PUBLIC_LINE_CHANNEL_ID!,
        client_secret: process.env.LINE_CHANNEL_SECRET!,
      }),
    });
    if (!tokenRes.ok) {
      return NextResponse.json({ error: "LINE token exchange failed" }, { status: 500 });
    }
    const tokens = await tokenRes.json();
    const verifyRes = await fetch("https://api.line.me/oauth2/v2.1/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        id_token: tokens.id_token,
        client_id: process.env.NEXT_PUBLIC_LINE_CHANNEL_ID!,
      }),
    });
    if (!verifyRes.ok) {
      return NextResponse.json({ error: "LINE token verification failed" }, { status: 500 });
    }
    const verified = await verifyRes.json();
    providerId = verified.sub;
  }

  if (!providerId) {
    return NextResponse.json({ error: "Missing providerId" }, { status: 400 });
  }

  // Get the user initiating the link
  const { data: currentUser } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", targetUserId)
    .single();

  if (!currentUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Find existing user with this provider ID
  let existingUser = null;
  if (provider === "line") {
    const { data } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("line_user_id", providerId)
      .neq("id", targetUserId)
      .maybeSingle();
    existingUser = data;
  } else if (provider === "google") {
    // Check by google_id
    const { data } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("google_id", providerId)
      .neq("id", targetUserId)
      .maybeSingle();
    existingUser = data;

    // Also check if the current auth user has a profile (covers google_id not set)
    if (!existingUser && auth.userId !== targetUserId) {
      const { data: authProfile } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("id", auth.userId)
        .maybeSingle();
      if (authProfile) {
        existingUser = authProfile;
      }
    }
  }

  if (existingUser) {
    // Existing account found — need confirmation
    if (!body.confirmMerge) {
      const [currentCounts, existingCounts] = await Promise.all([
        getUserDataSummary(supabaseAdmin, currentUser.id),
        getUserDataSummary(supabaseAdmin, existingUser.id),
      ]);

      return NextResponse.json({
        needsConfirm: true,
        currentAccount: {
          id: currentUser.id,
          display_name: currentUser.display_name,
          ...currentCounts,
        },
        existingAccount: {
          id: existingUser.id,
          display_name: existingUser.display_name,
          ...existingCounts,
        },
      });
    }

    // Confirmed — merge
    const keepAccountId = body.keepAccountId;
    const deleteAccountId = keepAccountId === currentUser.id ? existingUser.id : currentUser.id;
    const keepAccount = keepAccountId === currentUser.id ? currentUser : existingUser;

    // Collect the provider IDs to transfer
    let newLineUserId: string;
    let newGoogleId: string | null;
    if (provider === "line") {
      newLineUserId = providerId;
      newGoogleId = keepAccount.google_id || currentUser.google_id || existingUser.google_id;
    } else {
      newGoogleId = providerId;
      const keepLine = keepAccount.line_user_id;
      newLineUserId = (keepLine && !keepLine.startsWith("oauth-"))
        ? keepLine
        : (currentUser.line_user_id || existingUser.line_user_id);
    }

    // Delete the other account FIRST to avoid unique constraint violations
    // (line_user_id has a UNIQUE constraint)
    await deleteUserData(supabaseAdmin, deleteAccountId);
    await supabaseAdmin.auth.admin.deleteUser(deleteAccountId);

    // Now transfer provider IDs to the kept account
    const { error: updateError } = await supabaseAdmin.from("users").update({
      line_user_id: newLineUserId,
      google_id: newGoogleId,
    }).eq("id", keepAccountId);

    if (updateError) {
      console.error("[link] Merge update failed:", updateError);
    }

    return NextResponse.json({
      merged: true,
      mergedInto: keepAccountId,
      message: "アカウントを統合しました",
    });
  }

  // No existing account — simple link
  if (provider === "line") {
    const { error } = await supabaseAdmin.from("users").update({ line_user_id: providerId }).eq("id", targetUserId);
    console.log("[link] LINE simple link:", { targetUserId, error: error?.message });
  } else if (provider === "google") {
    // Clean up orphan Google user if exists
    const googleAuthUserId = auth.userId;
    if (googleAuthUserId !== targetUserId) {
      console.log("[link] Cleaning up orphan Google auth user:", googleAuthUserId);
      await deleteUserData(supabaseAdmin, googleAuthUserId);
      await supabaseAdmin.auth.admin.deleteUser(googleAuthUserId);
    }
    const { error } = await supabaseAdmin.from("users").update({ google_id: providerId }).eq("id", targetUserId);
    console.log("[link] Google simple link:", { targetUserId, providerId: providerId?.substring(0, 10), error: error?.message });
  }

  return NextResponse.json({ merged: false, message: `${provider === "google" ? "Google" : "LINE"}を連携しました` });
}

/**
 * DELETE /api/auth/link — Unlink a provider
 */
export async function DELETE(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { userId } = auth;

  const { provider } = await request.json();
  const supabaseAdmin = getSupabaseAdmin();

  // Try to find user by auth user ID first, then by google_id (orphan session)
  let { data: currentUser } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (!currentUser) {
    // Auth user ID doesn't match users.id — try finding by google_id
    const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(userId);
    const googleSub = authUser?.user_metadata?.sub;
    if (googleSub) {
      const { data } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("google_id", googleSub)
        .single();
      currentUser = data;
    }
  }

  if (!currentUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const hasLine = currentUser.line_user_id && !currentUser.line_user_id.startsWith("google-") && !currentUser.line_user_id.startsWith("oauth-");
  const hasGoogle = !!currentUser.google_id;

  if (!hasLine || !hasGoogle) {
    return NextResponse.json({ error: "最低1つのログイン方法が必要です" }, { status: 400 });
  }

  if (provider === "line") {
    await supabaseAdmin.from("users").update({ line_user_id: `oauth-${currentUser.id}` }).eq("id", currentUser.id);
  } else if (provider === "google") {
    await supabaseAdmin.from("users").update({ google_id: null, google_email: null }).eq("id", currentUser.id);
  } else {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

async function getUserDataSummary(supabase: any, userId: string) {
  const [clubsRes, practicesRes, accessoriesRes] = await Promise.all([
    supabase.from("clubs").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("practice_sessions").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("accessories").select("*", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  const [latestClub, latestPractice, latestAccessory] = await Promise.all([
    supabase.from("clubs").select("created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("practice_sessions").select("created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("accessories").select("created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const dates = [
    latestClub.data?.created_at,
    latestPractice.data?.created_at,
    latestAccessory.data?.created_at,
  ].filter(Boolean) as string[];

  return {
    lastUpdated: dates.length > 0 ? dates.sort().reverse()[0] : null,
    counts: {
      clubs: clubsRes.count ?? 0,
      practices: practicesRes.count ?? 0,
      accessories: accessoriesRes.count ?? 0,
    },
  };
}

async function deleteUserData(supabase: any, userId: string) {
  await supabase.from("favorite_courses").delete().eq("user_id", userId);
  await supabase.from("profiles").delete().eq("id", userId);
  await supabase.from("practice_sessions").delete().eq("user_id", userId);
  await supabase.from("accessories").delete().eq("user_id", userId);
  await supabase.from("clubs").delete().eq("user_id", userId);
  await supabase.from("users").delete().eq("id", userId);
}

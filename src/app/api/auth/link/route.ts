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
 * If the target provider has a separate account, clean it up.
 *
 * Accepts optional `originalUserId` — the user who initiated the link
 * (needed when Google OAuth replaces the session).
 */
export async function POST(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();

  const body = await request.json();
  const { provider, originalUserId } = body;
  let { providerId } = body;

  // Use originalUserId if provided (Google OAuth replaces the session)
  const targetUserId = originalUserId || auth.userId;

  if (!provider) {
    return NextResponse.json({ error: "Missing provider" }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  // For LINE linking via OAuth code, resolve the LINE user ID server-side
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

  // Get the user we're linking TO
  const { data: currentUser } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", targetUserId)
    .single();

  if (!currentUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (provider === "line") {
    // Check if LINE account already has a separate user
    const { data: existingLineUser } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("line_user_id", providerId)
      .neq("id", targetUserId)
      .maybeSingle();

    if (existingLineUser) {
      // Existing LINE user found — ask for confirmation
      if (!body.confirmMerge) {
        return NextResponse.json({
          needsConfirm: true,
          existingUser: {
            id: existingLineUser.id,
            display_name: existingLineUser.display_name,
            lineUserId: providerId,
          },
          message: `既存のLINEアカウント「${existingLineUser.display_name}」が見つかりました。現在のアカウントのデータは削除され、LINEアカウントのデータに切り替わります。`,
        });
      }

      // Confirmed — merge: keep existing LINE user, delete current user
      const googleId = currentUser.google_id;
      if (googleId) {
        await supabaseAdmin
          .from("users")
          .update({ google_id: googleId })
          .eq("id", existingLineUser.id);
      }

      await deleteUserData(supabaseAdmin, targetUserId);
      await supabaseAdmin.auth.admin.deleteUser(targetUserId);

      return NextResponse.json({
        merged: true,
        mergedInto: existingLineUser.id,
        message: "LINEアカウントに統合しました。再ログインしてください。",
      });
    }

    // No existing LINE user — just link, and clean up any orphan user with this LINE ID
    await supabaseAdmin
      .from("users")
      .update({ line_user_id: providerId })
      .eq("id", targetUserId);

    return NextResponse.json({ merged: false, message: "LINEを連携しました" });

  } else if (provider === "google") {
    // Check if Google account already has a separate user
    const { data: existingGoogleUser } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("google_id", providerId)
      .neq("id", targetUserId)
      .maybeSingle();

    if (existingGoogleUser) {
      if (!body.confirmMerge) {
        return NextResponse.json({
          needsConfirm: true,
          existingUser: {
            id: existingGoogleUser.id,
            display_name: existingGoogleUser.display_name,
          },
          message: `既存のGoogleアカウント「${existingGoogleUser.display_name}」が見つかりました。現在のアカウントのデータは削除され、Googleアカウントのデータに切り替わります。`,
        });
      }

      // Confirmed — merge: keep existing Google user, delete current user
      const lineId = currentUser.line_user_id;
      if (lineId && !lineId.startsWith("google-") && !lineId.startsWith("oauth-")) {
        await supabaseAdmin
          .from("users")
          .update({ line_user_id: lineId })
          .eq("id", existingGoogleUser.id);
      }

      await deleteUserData(supabaseAdmin, targetUserId);
      await supabaseAdmin.auth.admin.deleteUser(targetUserId);

      return NextResponse.json({
        merged: true,
        mergedInto: existingGoogleUser.id,
        message: "Googleアカウントに統合しました。再ログインしてください。",
      });
    }

    // No existing Google user — just link
    // Also clean up orphan: find any users record created by the Google OAuth session
    const googleAuthUserId = auth.userId; // The Google OAuth session user
    if (googleAuthUserId !== targetUserId) {
      // Delete the orphan users record created by Google OAuth auto-create
      await deleteUserData(supabaseAdmin, googleAuthUserId);
      await supabaseAdmin.auth.admin.deleteUser(googleAuthUserId);
    }

    await supabaseAdmin
      .from("users")
      .update({ google_id: providerId })
      .eq("id", targetUserId);

    return NextResponse.json({ merged: false, message: "Googleを連携しました" });
  }

  return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
}

/**
 * DELETE /api/auth/link
 * Unlink a provider from the current account.
 */
export async function DELETE(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { userId } = auth;

  const { provider } = await request.json();
  const supabaseAdmin = getSupabaseAdmin();

  const { data: currentUser } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (!currentUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const hasLine = currentUser.line_user_id && !currentUser.line_user_id.startsWith("google-") && !currentUser.line_user_id.startsWith("oauth-");
  const hasGoogle = !!currentUser.google_id;

  if (!hasLine || !hasGoogle) {
    return NextResponse.json({ error: "最低1つのログイン方法が必要です" }, { status: 400 });
  }

  if (provider === "line") {
    await supabaseAdmin
      .from("users")
      .update({ line_user_id: `oauth-${userId}` })
      .eq("id", userId);
  } else if (provider === "google") {
    await supabaseAdmin
      .from("users")
      .update({ google_id: null })
      .eq("id", userId);
  } else {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * Delete all user data (clubs, accessories, practice, etc.)
 */
async function deleteUserData(supabase: any, userId: string) {
  await supabase.from("favorite_courses").delete().eq("user_id", userId);
  await supabase.from("profiles").delete().eq("id", userId);
  await supabase.from("practice_sessions").delete().eq("user_id", userId);
  await supabase.from("accessories").delete().eq("user_id", userId);
  await supabase.from("clubs").delete().eq("user_id", userId);
  await supabase.from("users").delete().eq("id", userId);
}

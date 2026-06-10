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
 * If the target provider already has an account, merge into that account
 * (delete current account's data, switch to existing account).
 */
export async function POST(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { userId } = auth;

  const body = await request.json();
  const { provider } = body;
  let { providerId } = body;

  if (!provider) {
    return NextResponse.json({ error: "Missing provider" }, { status: 400 });
  }

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

  const supabaseAdmin = getSupabaseAdmin();

  // Get current user
  const { data: currentUser } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (!currentUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (provider === "line") {
    // Check if LINE account already exists
    const { data: existingLineUser } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("line_user_id", providerId)
      .neq("id", userId)
      .maybeSingle();

    if (existingLineUser) {
      // Existing LINE account found — merge into it (existing wins)
      // Add google_id from current user to existing user
      const googleId = currentUser.google_id;
      if (googleId) {
        await supabaseAdmin
          .from("users")
          .update({ google_id: googleId })
          .eq("id", existingLineUser.id);
      }

      // Delete current user's data and auth
      await deleteUserData(supabaseAdmin, userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);

      return NextResponse.json({
        merged: true,
        mergedInto: existingLineUser.id,
        message: "既存のLINEアカウントに統合しました。再ログインしてください。",
      });
    }

    // No existing LINE account — just link
    await supabaseAdmin
      .from("users")
      .update({ line_user_id: providerId })
      .eq("id", userId);

    return NextResponse.json({ merged: false, message: "LINEを連携しました" });

  } else if (provider === "google") {
    // Check if Google account already exists
    const { data: existingGoogleUser } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("google_id", providerId)
      .neq("id", userId)
      .maybeSingle();

    if (existingGoogleUser) {
      // Existing Google account found — merge into it
      const lineId = currentUser.line_user_id;
      if (lineId && !lineId.startsWith("google-") && !lineId.startsWith("oauth-")) {
        await supabaseAdmin
          .from("users")
          .update({ line_user_id: lineId })
          .eq("id", existingGoogleUser.id);
      }

      await deleteUserData(supabaseAdmin, userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);

      return NextResponse.json({
        merged: true,
        mergedInto: existingGoogleUser.id,
        message: "既存のGoogleアカウントに統合しました。再ログインしてください。",
      });
    }

    // No existing Google account — just link
    await supabaseAdmin
      .from("users")
      .update({ google_id: providerId })
      .eq("id", userId);

    return NextResponse.json({ merged: false, message: "Googleを連携しました" });
  }

  return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
}

/**
 * Delete all user data (clubs, accessories, practice, etc.)
 */
async function deleteUserData(supabase: any, userId: string) {
  // Delete in order respecting foreign keys
  await supabase.from("favorite_courses").delete().eq("user_id", userId);
  await supabase.from("profiles").delete().eq("id", userId);
  await supabase.from("practice_sessions").delete().eq("user_id", userId);
  await supabase.from("accessories").delete().eq("user_id", userId);
  await supabase.from("clubs").delete().eq("user_id", userId);
  await supabase.from("users").delete().eq("id", userId);
}

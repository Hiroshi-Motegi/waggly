import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function derivePassword(lineUserId: string): string {
  return crypto
    .createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY!)
    .update(lineUserId)
    .digest("hex");
}

/**
 * Exchange LINE authorization code for tokens, verify identity,
 * then create/find Supabase user and return session.
 */
export async function POST(request: NextRequest) {
  const { code, redirectUri } = await request.json();

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  // Exchange code for tokens with LINE
  const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: process.env.NEXT_PUBLIC_LINE_CHANNEL_ID!,
      client_secret: process.env.LINE_CHANNEL_SECRET!,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.json();
    console.error("[line-oauth] Token exchange failed:", err);
    return NextResponse.json({ error: "LINE token exchange failed" }, { status: 500 });
  }

  const tokens = await tokenRes.json();

  // Verify ID token to get LINE user ID
  const verifyRes = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      id_token: tokens.id_token,
      client_id: process.env.NEXT_PUBLIC_LINE_CHANNEL_ID!,
    }),
  });

  if (!verifyRes.ok) {
    console.error("[line-oauth] Token verify failed");
    return NextResponse.json({ error: "LINE token verification failed" }, { status: 500 });
  }

  const verified = await verifyRes.json();
  const lineUserId = verified.sub;
  const displayName = verified.name ?? "LINEユーザー";
  const avatarUrl = verified.picture ?? null;

  // Get or create Supabase user (same approach as existing LINE auth)
  const supabaseAdmin = getSupabaseAdmin();
  const email = `${lineUserId}@line.waggly.app`;
  const password = derivePassword(lineUserId);

  // Check if user exists
  const { data: existingUser } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("line_user_id", lineUserId)
    .maybeSingle();

  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
    await supabaseAdmin
      .from("users")
      .update({ display_name: displayName, avatar_url: avatarUrl })
      .eq("id", userId);

    // Check if auth user still exists (may have been deleted during account merge)
    const { data: { user: authCheck } } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (authCheck) {
      await supabaseAdmin.auth.admin.updateUserById(userId, { password });
    } else {
      // Auth user was deleted — recreate it with the same ID
      const { error: recreateError } = await supabaseAdmin.auth.admin.createUser({
        id: userId,
        email,
        password,
        email_confirm: true,
        user_metadata: { line_user_id: lineUserId, display_name: displayName },
      });
      if (recreateError) {
        // ID collision — create with new ID and update users table
        const { data: newAuth, error: newError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { line_user_id: lineUserId, display_name: displayName },
        });
        if (newError) {
          console.error("[line-oauth] Recreate auth failed:", newError);
          return NextResponse.json({ error: newError.message }, { status: 500 });
        }
        userId = newAuth.user.id;
        await supabaseAdmin.from("users").update({ id: userId }).eq("line_user_id", lineUserId);
      }
    }
  } else {
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { line_user_id: lineUserId, display_name: displayName },
    });

    if (authError) {
      console.error("[line-oauth] Create user failed:", authError);
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    userId = authUser.user.id;

    await supabaseAdmin.from("users").insert({
      id: userId,
      line_user_id: lineUserId,
      display_name: displayName,
      avatar_url: avatarUrl,
      agreed_terms_at: new Date().toISOString(),
    });
  }

  // Create session
  const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !signInData.session) {
    console.error("[line-oauth] Sign in failed:", signInError);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }

  return NextResponse.json({
    access_token: signInData.session.access_token,
    refresh_token: signInData.session.refresh_token,
  });
}

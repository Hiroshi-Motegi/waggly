import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/auth-helpers";

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

  // Verify ID token to get LINE user ID and profile
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

  const supabaseAdmin = getSupabaseAdmin();
  const email = `${lineUserId}@line.waggly.app`;
  const password = derivePassword(lineUserId);

  // user_providers で既存ユーザーを検索
  const { data: existingProvider } = await supabaseAdmin
    .from("user_providers")
    .select("user_id, auth_user_id")
    .eq("provider", "line")
    .eq("provider_sub", lineUserId)
    .maybeSingle();

  let authUserId: string;

  if (existingProvider?.auth_user_id) {
    // Returning user with existing auth account
    authUserId = existingProvider.auth_user_id;
    await supabaseAdmin
      .from("users")
      .update({ display_name: displayName, avatar_url: avatarUrl })
      .eq("id", existingProvider.user_id);
    await supabaseAdmin.auth.admin.updateUserById(authUserId, { password });
  } else {
    // Create auth user
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

    authUserId = authUser.user.id;

    if (existingProvider) {
      // User exists but no auth account yet - link it
      await supabaseAdmin
        .from("user_providers")
        .update({ auth_user_id: authUserId })
        .eq("provider", "line")
        .eq("provider_sub", lineUserId);
    } else {
      // Brand new user - create user + provider row
      const { data: newUser } = await supabaseAdmin
        .from("users")
        .insert({
          display_name: displayName,
          avatar_url: avatarUrl,
          agreed_terms_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (newUser) {
        await supabaseAdmin.from("user_providers").insert({
          user_id: newUser.id,
          provider: "line",
          auth_user_id: authUserId,
          provider_sub: lineUserId,
        });
      }
    }
  }

  // Create session — use actual auth user email (may differ from LINE email
  // if this user was originally created via Google OAuth)
  const { data: { user: signInAuthUser } } = await supabaseAdmin.auth.admin.getUserById(authUserId);
  const signInEmail = signInAuthUser?.email ?? email;

  const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email: signInEmail,
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

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin, uploadAvatarFromUrl } from "@/lib/auth-helpers";

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

  // LINE 専用の auth user (email/password) を作成/取得
  const { data: created } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { line_user_id: lineUserId, display_name: displayName },
  });

  if (created?.user) {
    authUserId = created.user.id;
  } else {
    // 既存 → signInWithPassword で取得
    const { data: signIn } = await supabaseAdmin.auth.signInWithPassword({ email, password });
    if (signIn?.user) {
      authUserId = signIn.user.id;
    } else {
      return NextResponse.json({ error: "LINE auth failed" }, { status: 500 });
    }
  }

  if (existingProvider) {
    // 既存ユーザー → プロフィールは上書きしない。auth_user_id の更新のみ。
    await supabaseAdmin
      .from("user_providers")
      .update({ auth_user_id: authUserId })
      .eq("provider", "line")
      .eq("provider_sub", lineUserId);
  } else {
    // 完全新規
    const { data: newUser } = await supabaseAdmin
      .from("users")
      .insert({
        display_name: displayName,
        avatar_url: null,
        agreed_terms_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    // アバターを Storage に保存
    if (newUser && avatarUrl) {
      const storedUrl = await uploadAvatarFromUrl(supabaseAdmin, newUser.id, avatarUrl);
      await supabaseAdmin.from("users").update({ avatar_url: storedUrl }).eq("id", newUser.id);
    }

    if (newUser) {
      await supabaseAdmin.from("user_providers").insert({
        user_id: newUser.id,
        provider: "line",
        auth_user_id: authUserId,
        provider_sub: lineUserId,
      });
    }
  }

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

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Exchange LINE authorization code for tokens, then create Supabase session
 * via signInWithIdToken. Bypasses Supabase's UserInfo call which fails with LINE.
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
    return NextResponse.json({ error: "LINE token exchange failed", detail: err }, { status: 500 });
  }

  const tokens = await tokenRes.json();
  const idToken = tokens.id_token;

  if (!idToken) {
    return NextResponse.json({ error: "No ID token from LINE" }, { status: 500 });
  }

  // Get profile from LINE (more reliable than UserInfo endpoint)
  const profileRes = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile = profileRes.ok ? await profileRes.json() : null;

  // Create Supabase session using ID token
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Try signInWithIdToken with custom provider
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "custom:line" as any,
    token: idToken,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data.session) {
    return NextResponse.json({ error: "No session created" }, { status: 500 });
  }

  // Ensure user profile exists
  const userId = data.user.id;
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (!existingUser) {
    await supabase.from("users").insert({
      id: userId,
      line_user_id: profile?.userId ?? data.user.user_metadata?.sub ?? `line-${userId}`,
      display_name: profile?.displayName ?? data.user.user_metadata?.name ?? "LINEユーザー",
      avatar_url: profile?.pictureUrl ?? data.user.user_metadata?.picture ?? null,
      agreed_terms_at: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
}

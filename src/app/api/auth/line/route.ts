import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin, verifyLineIdToken } from "@/lib/auth-helpers";

function derivePassword(lineUserId: string): string {
  return crypto
    .createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY!)
    .update(lineUserId)
    .digest("hex");
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  let lineUserId: string;
  let displayName: string;
  let avatarUrl: string | null = null;

  if (body.idToken) {
    const verified = await verifyLineIdToken(body.idToken);
    if (!verified) {
      return NextResponse.json({ error: "Invalid LINE token" }, { status: 401 });
    }
    lineUserId = verified.sub;
    displayName = body.displayName || verified.name;
    avatarUrl = body.avatarUrl || verified.picture || null;
  } else if (process.env.NODE_ENV === "development") {
    lineUserId = body.lineUserId;
    displayName = body.displayName;
    avatarUrl = body.avatarUrl ?? null;
  } else {
    return NextResponse.json({ error: "ID token required" }, { status: 400 });
  }

  if (!lineUserId || !displayName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

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

  // Generate session — use actual auth user email (may differ from LINE email
  // if this user was originally created via Google OAuth)
  const { data: { user: signInAuthUser } } = await supabaseAdmin.auth.admin.getUserById(authUserId);
  const signInEmail = signInAuthUser?.email ?? email;

  const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email: signInEmail,
    password,
  });

  if (signInError || !signInData.session) {
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }

  return NextResponse.json({
    access_token: signInData.session.access_token,
    refresh_token: signInData.session.refresh_token,
  });
}

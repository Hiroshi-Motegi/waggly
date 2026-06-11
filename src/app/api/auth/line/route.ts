import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";


function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Derive a deterministic password from LINE user ID + secret
function derivePassword(lineUserId: string): string {
  return crypto
    .createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY!)
    .update(lineUserId)
    .digest("hex");
}

// Verify LINE ID token server-side
async function verifyLineIdToken(idToken: string): Promise<{ sub: string; name: string; picture?: string } | null> {
  try {
    const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        id_token: idToken,
        client_id: process.env.NEXT_PUBLIC_LIFF_CHANNEL_ID!,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.sub) return null;
    return { sub: data.sub, name: data.name, picture: data.picture };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Prefer verified ID token; fall back to legacy flow only in development
  let lineUserId: string;
  let displayName: string;
  let avatarUrl: string | null = null;

  if (body.idToken) {
    // Verify LINE ID token
    const verified = await verifyLineIdToken(body.idToken);
    if (!verified) {
      return NextResponse.json({ error: "Invalid LINE token" }, { status: 401 });
    }
    lineUserId = verified.sub;
    displayName = body.displayName || verified.name;
    avatarUrl = body.avatarUrl || verified.picture || null;
  } else if (process.env.NODE_ENV === "development") {
    // Legacy: allow unverified in dev only
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

  // Check if user exists
  const { data: existingUser } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("line_user_id", lineUserId)
    .single();

  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
    // Update profile
    await supabaseAdmin
      .from("users")
      .update({ display_name: displayName, avatar_url: avatarUrl })
      .eq("id", userId);
    // Ensure password is set
    await supabaseAdmin.auth.admin.updateUserById(userId, { password });
  } else {
    // Create auth user with password
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { line_user_id: lineUserId, display_name: displayName },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    userId = authUser.user.id;

    // Create profile
    const { error: profileError } = await supabaseAdmin.from("users").insert({
      id: userId,
      line_user_id: lineUserId,
      display_name: displayName,
      avatar_url: avatarUrl,
    });

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }
  }

  // Generate session — use actual auth user email (may differ from LINE email
  // if this user was originally created via Google OAuth)
  const { data: { user: signInAuthUser } } = await supabaseAdmin.auth.admin.getUserById(userId);
  const signInEmail = signInAuthUser?.email ?? email;

  const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email: signInEmail,
    password,
  });

  if (signInError || !signInData.session) {
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }

  return NextResponse.json({
    userId,
    access_token: signInData.session.access_token,
    refresh_token: signInData.session.refresh_token,
  });
}

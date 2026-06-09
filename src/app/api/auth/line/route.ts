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

export async function POST(request: NextRequest) {
  const { lineUserId, displayName, avatarUrl } = await request.json();

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
    // Ensure password is set (may be missing from old auth flow)
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

  // Return credentials for client-side sign in
  return NextResponse.json({
    userId,
    email,
    password,
  });
}

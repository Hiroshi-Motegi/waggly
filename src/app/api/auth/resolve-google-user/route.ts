import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import crypto from "crypto";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/auth/resolve-google-user
 *
 * When a Google login results in an orphan account (either new or existing),
 * check if the real Google sub is linked to a different user via google_id.
 * If so, clean up the orphan and create a session for the linked user.
 *
 * Called when:
 * 1. No profile exists for the current auth user (new orphan after merge)
 * 2. Profile exists but google_id doesn't match real Google sub (old orphan)
 */
export async function POST(_request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) {
    console.log("[resolve] No auth");
    return unauthorized();
  }

  console.log("[resolve] authUserId:", auth.userId?.substring(0, 8));

  const supabaseAdmin = getSupabaseAdmin();

  // Get current auth user metadata
  const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(auth.userId);
  if (!authUser) {
    console.log("[resolve] Auth user not found in admin");
    return NextResponse.json({ found: false });
  }

  const googleSub = authUser.user_metadata?.sub;
  console.log("[resolve] googleSub:", googleSub?.substring(0, 10), "provider:", authUser.app_metadata?.provider);
  if (!googleSub) {
    return NextResponse.json({ found: false });
  }

  // Look up the user that owns this Google sub
  const { data: linkedUser } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("google_id", googleSub)
    .maybeSingle();

  console.log("[resolve] linkedUser:", linkedUser?.id?.substring(0, 8), "authUser:", auth.userId?.substring(0, 8), "same:", linkedUser?.id === auth.userId);

  // If the linked user IS the current auth user, no resolution needed
  if (linkedUser && linkedUser.id === auth.userId) {
    return NextResponse.json({ found: false });
  }

  if (!linkedUser) {
    console.log("[resolve] No linked user found for googleSub");
    return NextResponse.json({ found: false });
  }

  // Found a DIFFERENT user with the real Google sub.
  // The current auth user is an orphan — clean it up and switch sessions.

  // Delete orphan's user data if it exists in the users table
  const { data: orphanUser } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("id", auth.userId)
    .maybeSingle();

  if (orphanUser) {
    // Delete orphan's related data
    await supabaseAdmin.from("favorite_courses").delete().eq("user_id", auth.userId);
    await supabaseAdmin.from("profiles").delete().eq("id", auth.userId);
    await supabaseAdmin.from("practice_sessions").delete().eq("user_id", auth.userId);
    await supabaseAdmin.from("accessories").delete().eq("user_id", auth.userId);
    await supabaseAdmin.from("clubs").delete().eq("user_id", auth.userId);
    await supabaseAdmin.from("users").delete().eq("id", auth.userId);
  }

  // Create a session for the linked user's auth account
  const { data: { user: linkedAuthUser } } = await supabaseAdmin.auth.admin.getUserById(linkedUser.id);

  if (!linkedAuthUser) {
    return NextResponse.json({ found: false });
  }

  // Set a temporary password and sign in as the linked user
  const tempPassword = crypto.randomUUID();
  await supabaseAdmin.auth.admin.updateUserById(linkedUser.id, { password: tempPassword });

  const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email: linkedAuthUser.email!,
    password: tempPassword,
  });

  if (signInError || !signInData.session) {
    console.error("[resolve-google-user] Sign in failed:", signInError);
    return NextResponse.json({ found: false });
  }

  // Delete the orphan Google auth user
  await supabaseAdmin.auth.admin.deleteUser(auth.userId);

  return NextResponse.json({
    found: true,
    user: linkedUser,
    access_token: signInData.session.access_token,
    refresh_token: signInData.session.refresh_token,
  });
}

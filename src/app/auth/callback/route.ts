import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const link = searchParams.get("link"); // "google" if linking
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      if (link === "google") {
        return handleGoogleLink(request, data.user, origin);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/`);
}

/**
 * Handle Google account linking entirely server-side.
 * No more client-side link-complete page needed for this flow.
 */
async function handleGoogleLink(
  request: NextRequest,
  googleUser: any,
  origin: string
) {
  const { searchParams } = new URL(request.url);
  const originalUserId = searchParams.get("originalUser");
  const googleId = googleUser.user_metadata?.sub ?? googleUser.id;
  const googleAuthUserId = googleUser.id;

  console.log("[callback] Google link:", { googleId: googleId?.substring(0, 10), originalUserId, googleAuthUserId });

  if (!originalUserId) {
    console.error("[callback] No originalUser param");
    return NextResponse.redirect(`${origin}/settings?error=missing_user`);
  }

  const supabaseAdmin = getSupabaseAdmin();

  // Find the target user
  const { data: targetUser } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", originalUserId)
    .single();

  if (!targetUser) {
    console.error("[callback] Target user not found:", originalUserId);
    return NextResponse.redirect(`${origin}/settings?error=user_not_found`);
  }

  // Check if the Google auth user itself has an existing profile
  // (most reliable conflict detection — doesn't depend on google_id being set)
  let existingUser = null;
  if (googleAuthUserId !== originalUserId) {
    const { data: googleProfile } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", googleAuthUserId)
      .maybeSingle();
    if (googleProfile) {
      console.log("[callback] Conflict: Google auth user has existing profile:", googleAuthUserId);
      existingUser = googleProfile;
    }
  }

  // Also check by google_id (covers edge case where Google identity was merged into a different auth user)
  if (!existingUser) {
    const { data } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("google_id", googleId)
      .neq("id", originalUserId)
      .maybeSingle();
    existingUser = data;
  }

  if (existingUser) {
    // Conflict — need merge confirmation via client-side merge page
    console.log("[callback] Conflict found, redirecting to merge page");
    const url = new URL(`${origin}/auth/link-complete`);
    url.searchParams.set("provider", "google");
    url.searchParams.set("providerId", googleId);
    url.searchParams.set("originalUserId", originalUserId);
    return NextResponse.redirect(url.toString());
  }

  // No conflict — do the simple link right here, server-side
  console.log("[callback] Simple link: setting google_id on", originalUserId);

  // Set google_id on the target user
  const { error: updateError } = await supabaseAdmin
    .from("users")
    .update({ google_id: googleId })
    .eq("id", originalUserId);

  if (updateError) {
    console.error("[callback] Failed to update google_id:", updateError);
    return NextResponse.redirect(`${origin}/settings?error=link_failed`);
  }

  console.log("[callback] Google linked successfully, orphan auth user:", googleAuthUserId);

  // Don't delete the orphan Google auth user here — the browser still holds
  // a JWT for it. Let auth-provider's resolve-google-user API detect the
  // orphan, switch to the correct session, and clean up.
  // Redirect to root so auth-provider can resolve.
  return NextResponse.redirect(`${origin}/settings?linked=google`);
}

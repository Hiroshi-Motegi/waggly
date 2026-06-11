import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getUserDataSummary(supabase: any, userId: string) {
  const [clubsRes, practicesRes, accessoriesRes] = await Promise.all([
    supabase.from("clubs").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("practice_sessions").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("accessories").select("*", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  const [latestClub, latestPractice, latestAccessory] = await Promise.all([
    supabase.from("clubs").select("created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("practice_sessions").select("created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("accessories").select("created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const dates = [
    latestClub.data?.created_at,
    latestPractice.data?.created_at,
    latestAccessory.data?.created_at,
  ].filter(Boolean) as string[];

  return {
    lastUpdated: dates.length > 0 ? dates.sort().reverse()[0] : null,
    counts: {
      clubs: clubsRes.count ?? 0,
      practices: practicesRes.count ?? 0,
      accessories: accessoriesRes.count ?? 0,
    },
  };
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
    const [currentSummary, existingSummary] = await Promise.all([
      getUserDataSummary(supabaseAdmin, originalUserId),
      getUserDataSummary(supabaseAdmin, existingUser.id),
    ]);

    const conflictInfo = JSON.stringify({
      scenario: "account-linking",
      provider: "google",
      providerUserId: googleId,
      sourceA: {
        label: "現在のアカウントのデータ",
        isNew: false,
        wid: originalUserId,
        lastUpdated: currentSummary.lastUpdated,
        counts: currentSummary.counts,
      },
      sourceB: {
        label: "Googleアカウントのデータ",
        isNew: true,
        wid: existingUser.id,
        lastUpdated: existingSummary.lastUpdated,
        counts: existingSummary.counts,
      },
    });

    const url = new URL(`${origin}/auth/resolve-conflict`);
    const response = NextResponse.redirect(url.toString());
    response.cookies.set("conflict_info", encodeURIComponent(conflictInfo), {
      path: "/",
      maxAge: 300,
      httpOnly: false,
    });
    return response;
  }

  // No conflict — do the simple link right here, server-side
  console.log("[callback] Simple link: setting google_id on", originalUserId);

  // Set google_id and google_email on the target user
  const googleEmail = googleUser.user_metadata?.email ?? googleUser.email ?? null;
  const { error: updateError } = await supabaseAdmin
    .from("users")
    .update({ google_id: googleId, google_email: googleEmail })
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

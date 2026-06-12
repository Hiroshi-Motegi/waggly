import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/auth-helpers";
import { getUserDataSummary } from "@/lib/user-data-summary";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const link = searchParams.get("link");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      if (link === "google") {
        return handleGoogleLink(request, data.user, origin);
      }
      // Normal login → auth-provider's resolve-session handles it
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/`);
}

/**
 * Google linking callback.
 * Extract google_sub from the OAuth user, check user_providers for conflicts,
 * then insert a new provider row or return conflict info.
 */
async function handleGoogleLink(
  request: NextRequest,
  googleUser: any,
  origin: string
) {
  const { searchParams } = new URL(request.url);
  const originalUserId = searchParams.get("originalUser");
  const googleSub = googleUser.user_metadata?.sub ?? googleUser.id;
  const googleEmail = googleUser.user_metadata?.email ?? googleUser.email ?? null;

  if (!originalUserId) {
    return NextResponse.redirect(`${origin}/settings?error=missing_user`);
  }

  const supabaseAdmin = getSupabaseAdmin();

  // Check user_providers for conflict
  const { data: existingProvider } = await supabaseAdmin
    .from("user_providers")
    .select("user_id")
    .eq("provider", "google")
    .eq("provider_sub", googleSub)
    .maybeSingle();

  if (existingProvider && existingProvider.user_id !== originalUserId) {
    // Conflict → redirect to settings with conflict info in cookie
    const [currentSummary, existingSummary] = await Promise.all([
      getUserDataSummary(supabaseAdmin, originalUserId),
      getUserDataSummary(supabaseAdmin, existingProvider.user_id),
    ]);

    const conflictInfo = JSON.stringify({
      scenario: "account-linking",
      provider: "google",
      providerSub: googleSub,
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
        wid: existingProvider.user_id,
        lastUpdated: existingSummary.lastUpdated,
        counts: existingSummary.counts,
      },
    });

    const response = NextResponse.redirect(`${origin}/settings?conflict=google`);
    response.cookies.set("conflict_info", encodeURIComponent(conflictInfo), {
      path: "/",
      maxAge: 300,
      httpOnly: false,
    });
    return response;
  }

  // No conflict → insert user_providers row
  const { error: insertErr } = await supabaseAdmin.from("user_providers").insert({
    user_id: originalUserId,
    provider: "google",
    provider_sub: googleSub,
    provider_email: googleEmail,
    auth_user_id: googleUser.id,
  });
  console.log("[callback] Google link insert:", {
    originalUserId,
    googleSub: googleSub?.substring(0, 10),
    googleAuthUserId: googleUser.id,
    error: insertErr?.message,
  });

  // Update google_email on users table too
  if (googleEmail) {
    await supabaseAdmin
      .from("users")
      .update({ google_email: googleEmail })
      .eq("id", originalUserId);
  }

  return NextResponse.redirect(`${origin}/settings?linked=google`);
}

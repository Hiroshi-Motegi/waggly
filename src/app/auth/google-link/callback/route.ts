import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/auth-helpers";
import { getUserDataSummary } from "@/lib/user-data-summary";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !stateParam) {
    return NextResponse.redirect(`${origin}/settings?error=google_link_failed`);
  }

  // Decode state
  let originalUserId: string;
  try {
    const decoded = JSON.parse(Buffer.from(stateParam, "base64").toString());
    originalUserId = decoded.originalUser;
    if (!originalUserId) throw new Error("missing originalUser");
  } catch {
    return NextResponse.redirect(`${origin}/settings?error=invalid_state`);
  }

  // Exchange code for tokens with Google
  const redirectUri = `${origin}/auth/google-link/callback`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  });

  if (!tokenRes.ok) {
    console.error("[google-link] Token exchange failed:", await tokenRes.text());
    return NextResponse.redirect(`${origin}/settings?error=google_link_failed`);
  }

  const tokens = await tokenRes.json();

  // Verify ID token
  const verifyRes = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokens.id_token)}`
  );
  if (!verifyRes.ok) {
    return NextResponse.redirect(`${origin}/settings?error=google_link_failed`);
  }
  const verified = await verifyRes.json();
  const googleSub = verified.sub as string;

  if (!googleSub) {
    return NextResponse.redirect(`${origin}/settings?error=google_link_failed`);
  }

  const supabaseAdmin = getSupabaseAdmin();

  // Conflict check
  const { data: existingProvider } = await supabaseAdmin
    .from("user_providers")
    .select("user_id")
    .eq("provider", "google")
    .eq("provider_sub", googleSub)
    .maybeSingle();

  if (existingProvider && existingProvider.user_id !== originalUserId) {
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

    const infoHash = Buffer.from(conflictInfo).toString("base64url");
    return NextResponse.redirect(`${origin}/settings?conflict=google#${infoHash}`);
  }

  if (existingProvider && existingProvider.user_id === originalUserId) {
    return NextResponse.redirect(`${origin}/settings?linked=google`);
  }

  // No conflict → insert
  const { error: insertError } = await supabaseAdmin.from("user_providers").insert({
    user_id: originalUserId,
    provider: "google",
    provider_sub: googleSub,
  });

  if (insertError) {
    console.error("[google-link] Insert failed:", insertError);
    return NextResponse.redirect(`${origin}/settings?error=google_link_failed`);
  }

  return NextResponse.redirect(`${origin}/settings?linked=google`);
}

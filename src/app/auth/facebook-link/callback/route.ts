import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/auth-helpers";
import { getUserDataSummary } from "@/lib/user-data-summary";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !stateParam) {
    return NextResponse.redirect(`${origin}/settings?error=facebook_link_failed`);
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

  const redirectUri = `${origin}/auth/facebook-link/callback`;
  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID!;
  const appSecret = process.env.FACEBOOK_APP_SECRET!;

  // Exchange code for access token
  const tokenRes = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?` +
      new URLSearchParams({ client_id: appId, client_secret: appSecret, code, redirect_uri: redirectUri })
  );

  if (!tokenRes.ok) {
    console.error("[facebook-link] Token exchange failed:", await tokenRes.text());
    return NextResponse.redirect(`${origin}/settings?error=facebook_link_failed`);
  }

  const { access_token } = await tokenRes.json();

  // Get user info
  const meRes = await fetch(
    `https://graph.facebook.com/me?fields=id,name,email&access_token=${access_token}`
  );
  if (!meRes.ok) {
    return NextResponse.redirect(`${origin}/settings?error=facebook_link_failed`);
  }

  const me = await meRes.json();
  const facebookSub = me.id as string;
  const facebookEmail = (me.email as string) ?? null;

  if (!facebookSub) {
    return NextResponse.redirect(`${origin}/settings?error=facebook_link_failed`);
  }

  const supabaseAdmin = getSupabaseAdmin();

  // Conflict check
  const { data: existingProvider } = await supabaseAdmin
    .from("user_providers")
    .select("user_id")
    .eq("provider", "facebook")
    .eq("provider_sub", facebookSub)
    .maybeSingle();

  if (existingProvider && existingProvider.user_id !== originalUserId) {
    const [currentSummary, existingSummary] = await Promise.all([
      getUserDataSummary(supabaseAdmin, originalUserId),
      getUserDataSummary(supabaseAdmin, existingProvider.user_id),
    ]);

    const conflictInfo = JSON.stringify({
      scenario: "account-linking",
      provider: "facebook",
      providerSub: facebookSub,
      sourceA: {
        label: "現在のアカウントのデータ",
        isNew: false,
        wid: originalUserId,
        lastUpdated: currentSummary.lastUpdated,
        counts: currentSummary.counts,
      },
      sourceB: {
        label: "Facebookアカウントのデータ",
        isNew: true,
        wid: existingProvider.user_id,
        lastUpdated: existingSummary.lastUpdated,
        counts: existingSummary.counts,
      },
    });

    const infoHash = Buffer.from(conflictInfo).toString("base64url");
    return NextResponse.redirect(`${origin}/settings?conflict=facebook#${infoHash}`);
  }

  if (existingProvider && existingProvider.user_id === originalUserId) {
    return NextResponse.redirect(`${origin}/settings?linked=facebook`);
  }

  // No conflict → insert
  await supabaseAdmin.from("user_providers").insert({
    user_id: originalUserId,
    provider: "facebook",
    provider_sub: facebookSub,
    provider_email: facebookEmail,
  });

  return NextResponse.redirect(`${origin}/settings?linked=facebook`);
}

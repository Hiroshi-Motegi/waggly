import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

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
        // Google account linking mode
        // The Google OAuth created a NEW session for the Google user
        // We need to link this Google ID to the ORIGINAL user
        const googleId = data.user.user_metadata?.sub ?? data.user.id;

        // Store in a cookie/param for the client to complete linking
        const url = new URL(`${origin}/auth/link-complete`);
        url.searchParams.set("provider", "google");
        url.searchParams.set("providerId", googleId);
        return NextResponse.redirect(url.toString());
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/`);
}

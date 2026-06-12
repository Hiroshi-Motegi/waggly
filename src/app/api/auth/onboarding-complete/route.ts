import { NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { ONBOARDING_VERSION } from "@/lib/constants";

export async function POST() {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();

  const { error } = await auth.supabase
    .from("users")
    .update({ onboarding_version: ONBOARDING_VERSION })
    .eq("id", auth.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, onboarding_version: ONBOARDING_VERSION });
}

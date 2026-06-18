import { NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { ONBOARDING_VERSION } from "@/lib/constants";
import { supabaseError } from "@/lib/api-error";

export async function POST() {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();

  const { error } = await auth.supabase
    .from("users")
    .update({ onboarding_version: ONBOARDING_VERSION })
    .eq("id", auth.userId);

  if (error) {
    return supabaseError(error);
  }

  return NextResponse.json({ success: true, onboarding_version: ONBOARDING_VERSION });
}

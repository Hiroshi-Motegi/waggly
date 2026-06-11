import { NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { getSupabaseAdmin } from "@/lib/auth-helpers";

export async function GET() {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();

  const supabaseAdmin = getSupabaseAdmin();
  const { data } = await supabaseAdmin
    .from("user_providers")
    .select("provider, provider_email")
    .eq("user_id", auth.userId);

  return NextResponse.json(data ?? []);
}

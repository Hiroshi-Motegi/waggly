import { NextResponse } from "next/server";
import { getApiAuth, getAdminClient, unauthorized } from "@/lib/supabase/api";

export async function GET() {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { userId } = auth;

  const supabase = getAdminClient();
  const { data } = await supabase
    .from("users")
    .select("ad_free")
    .eq("id", userId)
    .single();

  return NextResponse.json({ ad_free: data?.ad_free ?? false });
}

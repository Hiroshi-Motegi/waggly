import { NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { getUserDataSummary } from "@/lib/user-data-summary";

export async function GET() {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();

  const { supabase, userId } = auth;

  const summary = await getUserDataSummary(supabase, userId);

  return NextResponse.json({
    wid: userId,
    ...summary,
  });
}

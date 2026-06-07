import { NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";

const MONTHLY_TOKEN_LIMIT = 150000; // 15万トークン/月

export async function GET() {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  // Get first day of current month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data, error } = await supabase
    .from("ai_usage")
    .select("input_tokens, output_tokens")
    .eq("user_id", userId)
    .gte("created_at", monthStart);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const totalInput = (data ?? []).reduce((sum: number, r: any) => sum + (r.input_tokens ?? 0), 0);
  const totalOutput = (data ?? []).reduce((sum: number, r: any) => sum + (r.output_tokens ?? 0), 0);
  const totalTokens = totalInput + totalOutput;

  return NextResponse.json({
    month: `${now.getFullYear()}/${now.getMonth() + 1}`,
    inputTokens: totalInput,
    outputTokens: totalOutput,
    totalTokens,
    limit: MONTHLY_TOKEN_LIMIT,
    remaining: Math.max(0, MONTHLY_TOKEN_LIMIT - totalTokens),
    limitReached: totalTokens >= MONTHLY_TOKEN_LIMIT,
  });
}

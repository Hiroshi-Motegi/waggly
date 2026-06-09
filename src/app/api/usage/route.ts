import { NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { getMonthlyLimit, getUsage } from "@/lib/ai/usage-limit";

export async function GET() {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [limit, , detailRes] = await Promise.all([
    getMonthlyLimit(supabase, userId),
    undefined,
    supabase
      .from("ai_usage")
      .select("input_tokens, output_tokens")
      .eq("user_id", userId)
      .gte("created_at", monthStart),
  ]);

  const data = detailRes.data ?? [];
  const totalInput = data.reduce((sum: number, r: any) => sum + (r.input_tokens ?? 0), 0);
  const totalOutput = data.reduce((sum: number, r: any) => sum + (r.output_tokens ?? 0), 0);
  const totalTokens = totalInput + totalOutput;

  return NextResponse.json({
    month: `${now.getFullYear()}/${now.getMonth() + 1}`,
    inputTokens: totalInput,
    outputTokens: totalOutput,
    totalTokens,
    limit,
    remaining: Math.max(0, limit - totalTokens),
    limitReached: totalTokens >= limit,
  });
}

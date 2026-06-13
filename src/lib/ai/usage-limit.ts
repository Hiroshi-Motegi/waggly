const DEFAULT_TOKEN_LIMIT = 100000;

export async function getMonthlyLimit(supabase: any, userId: string): Promise<number> {
  // Check if user has an active subscription with a plan
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan:plans(ai_monthly_tokens)")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  return sub?.plan?.ai_monthly_tokens ?? DEFAULT_TOKEN_LIMIT;
}

export async function getUsage(supabase: any, userId: string): Promise<number> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data } = await supabase
    .from("ai_usage")
    .select("input_tokens, output_tokens")
    .eq("user_id", userId)
    .gte("created_at", monthStart);

  return (data ?? []).reduce(
    (sum: number, r: any) => sum + (r.input_tokens ?? 0) + (r.output_tokens ?? 0),
    0
  );
}

export async function checkUsageLimit(supabase: any, userId: string): Promise<boolean> {
  const [limit, usage] = await Promise.all([
    getMonthlyLimit(supabase, userId),
    getUsage(supabase, userId),
  ]);

  return usage < limit;
}

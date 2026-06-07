const MONTHLY_TOKEN_LIMIT = 150000;

export async function checkUsageLimit(supabase: any, userId: string): Promise<boolean> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data } = await supabase
    .from("ai_usage")
    .select("input_tokens, output_tokens")
    .eq("user_id", userId)
    .gte("created_at", monthStart);

  const total = (data ?? []).reduce(
    (sum: number, r: any) => sum + (r.input_tokens ?? 0) + (r.output_tokens ?? 0),
    0
  );

  return total < MONTHLY_TOKEN_LIMIT;
}

import { getAdminClient } from "@/lib/supabase/api";
import { PLAN_ID, FREE_PLAN, getMonthJST } from "@/lib/plans";
import type { Plan } from "@/lib/plans";

/** ユーザーのアクティブプランの上限を取得 */
export async function getUserPlanLimits(userId: string): Promise<Plan> {
  const supabase = getAdminClient();

  // active or paused なサブスクを取得（paused は期間内 Pro 継続）
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan_id, status, current_period_end, grace_period_end")
    .eq("user_id", userId)
    .in("status", ["active", "paused"])
    .single();

  if (!sub) return FREE_PLAN;

  // grace_period_end 超過チェック
  if (
    sub.grace_period_end &&
    new Date(sub.grace_period_end) < new Date()
  ) {
    await supabase
      .from("subscriptions")
      .update({ status: "expired" })
      .eq("user_id", userId)
      .eq("status", "active");
    return FREE_PLAN;
  }

  const { data: plan } = await supabase
    .from("plans")
    .select("*")
    .eq("id", sub.plan_id)
    .single();
  return (plan as Plan) ?? FREE_PLAN;
}

/**
 * 回数チェック + インクリメント（原子的）
 * @returns 現在のカウント（成功時）、null（上限到達時）
 */
export async function incrementUsageCounter(
  userId: string,
  source: "chat" | "plan"
): Promise<number | null> {
  const supabase = getAdminClient();
  const month = getMonthJST();
  const plan = await getUserPlanLimits(userId);
  const limit =
    source === "chat"
      ? plan.ai_chat_monthly_limit
      : plan.ai_plan_monthly_limit;

  // 1. カウンター行がなければ作成
  await supabase.rpc("ensure_usage_counter", {
    p_user_id: userId,
    p_source: source,
    p_month: month,
  });

  // 2. 原子的インクリメント
  const { data, error } = await supabase.rpc("increment_usage_counter", {
    p_user_id: userId,
    p_source: source,
    p_month: month,
    p_limit: limit,
  });

  if (error || data === null || data === undefined) return null;
  return data as number;
}

/** AI API失敗時のカウンター補正 */
export async function decrementUsageCounter(
  userId: string,
  source: "chat" | "plan"
): Promise<void> {
  const supabase = getAdminClient();
  const month = getMonthJST();
  await supabase.rpc("decrement_usage_counter", {
    p_user_id: userId,
    p_source: source,
    p_month: month,
  });
}

/** ユーザーの当月の使用量を取得 */
export async function getUsageCounts(
  userId: string
): Promise<{ chat: number; plan: number }> {
  const supabase = getAdminClient();
  const month = getMonthJST();

  const { data } = await supabase
    .from("ai_usage_counters")
    .select("source, count")
    .eq("user_id", userId)
    .eq("month", month);

  const counts = { chat: 0, plan: 0 };
  for (const row of data ?? []) {
    if (row.source === "chat") counts.chat = row.count;
    if (row.source === "plan") counts.plan = row.count;
  }
  return counts;
}

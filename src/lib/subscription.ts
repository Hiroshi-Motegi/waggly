import { getAdminClient } from "@/lib/supabase/api";
import { FREE_PLAN } from "@/lib/plans";
import type { Subscription, Plan } from "@/lib/plans";

/** アクティブサブスク取得。canceled→expired の遷移も処理 */
export async function getActiveSubscription(
  userId: string
): Promise<{ subscription: Subscription | null; plan: Plan }> {
  const supabase = getAdminClient();

  // canceled で期間終了済みを expired に遷移
  await supabase
    .from("subscriptions")
    .update({ status: "expired" })
    .eq("user_id", userId)
    .eq("status", "canceled")
    .lt("current_period_end", new Date().toISOString());

  // grace_period_end 超過も expired に
  await supabase
    .from("subscriptions")
    .update({ status: "expired" })
    .eq("user_id", userId)
    .eq("status", "active")
    .not("grace_period_end", "is", null)
    .lt("grace_period_end", new Date().toISOString());

  // active or paused を取得（paused は期間内 Pro 継続）
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*, plan:plans(*)")
    .eq("user_id", userId)
    .in("status", ["active", "paused"])
    .single();

  if (!sub) return { subscription: null, plan: FREE_PLAN };
  return {
    subscription: sub as unknown as Subscription,
    plan: (sub.plan as unknown as Plan) ?? FREE_PLAN,
  };
}

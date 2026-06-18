import { getAdminClient } from "@/lib/supabase/api";
import { FREE_PLAN } from "@/lib/plans";
import type { Subscription, Plan } from "@/lib/plans";

/** アクティブサブスク取得（読み取り専用）。
 *  expired 遷移は cron/expire-subscriptions で実施。 */
export async function getActiveSubscription(
  userId: string
): Promise<{ subscription: Subscription | null; plan: Plan }> {
  const supabase = getAdminClient();

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

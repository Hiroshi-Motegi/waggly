import { createClient } from "@supabase/supabase-js";
import { FREE_PLAN } from "@/lib/plans";
import type { Subscription, Plan } from "@/lib/plans";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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

  // active を取得
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*, plan:plans(*)")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (!sub) return { subscription: null, plan: FREE_PLAN };
  return {
    subscription: sub as unknown as Subscription,
    plan: (sub.plan as unknown as Plan) ?? FREE_PLAN,
  };
}

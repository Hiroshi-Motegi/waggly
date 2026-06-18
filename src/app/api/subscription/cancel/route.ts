import { NextResponse } from "next/server";
import { getApiAuth, getAdminClient, unauthorized } from "@/lib/supabase/api";
import { getPayjpClient } from "@/lib/payjp";

export async function POST() {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { userId } = auth;

  const supabase = getAdminClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, payjp_subscription_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (!sub) {
    return NextResponse.json(
      { error: "no_active_subscription" },
      { status: 404 }
    );
  }

  // Pay.jp を先にキャンセル
  if (sub.payjp_subscription_id) {
    await getPayjpClient().subscriptions.cancel(sub.payjp_subscription_id);
  }

  // DB更新
  await supabase
    .from("subscriptions")
    .update({ status: "canceled" })
    .eq("id", sub.id);

  return NextResponse.json({ success: true });
}

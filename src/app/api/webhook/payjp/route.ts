import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  const body = await req.text();

  // TODO: Pay.jp署名検証（Payjp-Signatureヘッダ）
  // Pay.jpのSDKにビルトインの検証メソッドがあればそちらを使う

  const event = JSON.parse(body);
  const eventId = event.id;
  const eventType = event.type;

  const supabase = getAdminClient();

  // 冪等性チェック
  const { data: existing } = await supabase
    .from("webhook_events")
    .select("id")
    .eq("id", eventId)
    .single();

  if (existing) return NextResponse.json({ received: true });

  await supabase
    .from("webhook_events")
    .insert({ id: eventId, event_type: eventType });

  const subscriptionData = event.data;

  switch (eventType) {
    case "subscription.renewed": {
      const payjpSubId = subscriptionData.id;
      await supabase
        .from("subscriptions")
        .update({
          current_period_start: new Date(
            subscriptionData.current_period_start * 1000
          ).toISOString(),
          current_period_end: new Date(
            subscriptionData.current_period_end * 1000
          ).toISOString(),
          grace_period_end: null,
        })
        .eq("payjp_subscription_id", payjpSubId);
      break;
    }
    case "subscription.canceled": {
      const payjpSubId = subscriptionData.id;
      await supabase
        .from("subscriptions")
        .update({ status: "canceled" })
        .eq("payjp_subscription_id", payjpSubId);
      break;
    }
    case "charge.succeeded": {
      const customerId = subscriptionData.customer;
      await supabase
        .from("subscriptions")
        .update({ grace_period_end: null })
        .eq("payjp_customer_id", customerId)
        .eq("status", "active");
      break;
    }
    case "charge.failed": {
      const customerId = subscriptionData.customer;
      const graceEnd = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ).toISOString();
      // grace_period_end IS NULL の場合のみセット
      await supabase.rpc("set_grace_period", {
        p_customer_id: customerId,
        p_grace_end: graceEnd,
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}

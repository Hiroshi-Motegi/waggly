import crypto from "crypto";
import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/api";

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function POST(req: Request) {
  // Pay.jp 発信元トークン検証（タイミングセーフ比較）
  const webhookToken = req.headers.get("x-payjp-webhook-token");
  const expectedToken = process.env.PAYJP_WEBHOOK_TOKEN;
  if (!webhookToken || !expectedToken || !timingSafeEqual(webhookToken, expectedToken)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const body = await req.text();

  let event: {
    id?: string;
    type?: string;
    data?: {
      id?: string;
      customer?: string;
      current_period_start?: number;
      current_period_end?: number;
    };
  };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const eventId = event.id;
  const eventType = event.type;

  if (!eventId || !eventType) {
    return NextResponse.json({ error: "invalid event" }, { status: 400 });
  }

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
  if (!subscriptionData) {
    return NextResponse.json({ error: "missing event data" }, { status: 400 });
  }

  switch (eventType) {
    case "subscription.renewed": {
      const payjpSubId = subscriptionData.id!;
      await supabase
        .from("subscriptions")
        .update({
          current_period_start: new Date(
            subscriptionData.current_period_start! * 1000
          ).toISOString(),
          current_period_end: new Date(
            subscriptionData.current_period_end! * 1000
          ).toISOString(),
          grace_period_end: null,
        })
        .eq("payjp_subscription_id", payjpSubId);
      break;
    }
    case "subscription.canceled": {
      const payjpSubId = subscriptionData.id!;
      await supabase
        .from("subscriptions")
        .update({ status: "canceled" })
        .eq("payjp_subscription_id", payjpSubId);
      break;
    }
    case "charge.succeeded": {
      const customerId = subscriptionData.customer!;
      await supabase
        .from("subscriptions")
        .update({ grace_period_end: null })
        .eq("payjp_customer_id", customerId)
        .eq("status", "active");
      break;
    }
    case "charge.failed": {
      const customerId = subscriptionData.customer!;
      const graceEnd = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ).toISOString();
      await supabase.rpc("set_grace_period", {
        p_customer_id: customerId,
        p_grace_end: graceEnd,
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}

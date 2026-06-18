import { NextResponse } from "next/server";
import { getApiAuth, getAdminClient, unauthorized } from "@/lib/supabase/api";
import { getPayjpClient } from "@/lib/payjp";
import { PLAN_ID } from "@/lib/plans";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";

export async function POST(req: Request) {
  // レートリミット: IP あたり 1分5回
  const ip = getClientIP(req);
  const { allowed } = await checkRateLimit(`payment:${ip}`, 5, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "リクエストが多すぎます。しばらくしてからお試しください。" }, { status: 429 });
  }

  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { userId } = auth;

  const { token, coupon_code } = await req.json();
  if (!token || typeof token !== "string" || token.length > 100) {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }
  if (coupon_code && (typeof coupon_code !== "string" || coupon_code.length > 50)) {
    return NextResponse.json({ error: "invalid coupon code" }, { status: 400 });
  }

  const supabase = getAdminClient();
  let couponId: string | null = null;
  let coupon: { discount_percent: number; free_months: number } | null = null;

  // ── Phase 1: クーポン予約（あれば）──
  if (coupon_code) {
    const { data: c } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", coupon_code.trim().toUpperCase())
      .eq("is_active", true)
      .single();

    if (
      !c ||
      (c.expires_at && new Date(c.expires_at) < new Date())
    ) {
      return NextResponse.json({ error: "invalid_coupon" }, { status: 400 });
    }

    // redemption INSERT
    const { error: redemptionError } = await supabase
      .from("coupon_redemptions")
      .insert({ user_id: userId, coupon_id: c.id, purpose: "subscription" });

    if (redemptionError) {
      return NextResponse.json(
        { error: "coupon_already_used" },
        { status: 400 }
      );
    }

    // used_count INCREMENT (atomic)
    const { data: updated } = await supabase.rpc("increment_coupon_usage", {
      p_coupon_id: c.id,
    });
    if (!updated) {
      await supabase
        .from("coupon_redemptions")
        .delete()
        .eq("user_id", userId)
        .eq("coupon_id", c.id);
      return NextResponse.json(
        { error: "coupon_maxed_out" },
        { status: 400 }
      );
    }

    couponId = c.id;
    coupon = {
      discount_percent: c.discount_percent,
      free_months: c.free_months,
    };
  }

  // ── Phase 2: Pay.jp API ──
  try {
    // 既存カスタマー or 新規作成
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("payjp_customer_id")
      .eq("user_id", userId)
      .not("payjp_customer_id", "is", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    let customerId = existingSub?.payjp_customer_id;
    if (customerId) {
      try {
        await getPayjpClient().customers.update(customerId, { card: token });
      } catch (e: unknown) {
        // 同じカードの場合はスキップ（already_have_card）
        const code = (e as { body?: { error?: { code?: string } } })?.body?.error?.code;
        if (code !== "already_have_card") throw e;
      }
    } else {
      const customer = await getPayjpClient().customers.create({ card: token });
      customerId = customer.id;
    }

    let payjpSubId: string;
    let periodStart: string;
    let periodEnd: string;
    let trialEnd: string | null = null;

    if (coupon?.discount_percent) {
      // 初月割引: 手動チャージ + trial_end で翌月開始
      const { data: planRow } = await supabase
        .from("plans")
        .select("price")
        .eq("id", PLAN_ID.PRO)
        .single();
      const price = planRow!.price;
      const discounted = Math.round(
        price * (1 - coupon.discount_percent / 100)
      );
      await getPayjpClient().charges.create({
        amount: discounted,
        currency: "jpy",
        customer: customerId,
      });
      const trialEndTs =
        Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      const sub = await getPayjpClient().subscriptions.create({
        customer: customerId,
        plan: PLAN_ID.PRO,
        trial_end: trialEndTs,
      });
      payjpSubId = sub.id;
      periodStart = new Date().toISOString();
      periodEnd = new Date(trialEndTs * 1000).toISOString();
      trialEnd = periodEnd;
    } else if (coupon?.free_months) {
      // 日数無料
      const trialDays = coupon.free_months * 30;
      const trialEndTs =
        Math.floor(Date.now() / 1000) + trialDays * 24 * 60 * 60;
      const sub = await getPayjpClient().subscriptions.create({
        customer: customerId,
        plan: PLAN_ID.PRO,
        trial_end: trialEndTs,
      });
      payjpSubId = sub.id;
      periodStart = new Date().toISOString();
      periodEnd = new Date(trialEndTs * 1000).toISOString();
      trialEnd = periodEnd;
    } else {
      // 通常
      const sub = await getPayjpClient().subscriptions.create({
        customer: customerId,
        plan: PLAN_ID.PRO,
      });
      payjpSubId = sub.id;
      periodStart = new Date(
        sub.current_period_start * 1000
      ).toISOString();
      periodEnd = new Date(
        sub.current_period_end * 1000
      ).toISOString();
    }

    // ── Phase 3: DB確定 ──
    // canceled 行があれば再利用
    const { data: canceledSub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "canceled")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    let subscriptionId: string;
    if (canceledSub) {
      const { data: updated } = await supabase
        .from("subscriptions")
        .update({
          status: "active",
          plan_id: PLAN_ID.PRO,
          payjp_subscription_id: payjpSubId,
          payjp_customer_id: customerId,
          current_period_start: periodStart,
          current_period_end: periodEnd,
          trial_end: trialEnd,
          grace_period_end: null,
        })
        .eq("id", canceledSub.id)
        .select("id")
        .single();
      subscriptionId = updated!.id;
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("subscriptions")
        .insert({
          user_id: userId,
          plan_id: PLAN_ID.PRO,
          payjp_subscription_id: payjpSubId,
          payjp_customer_id: customerId,
          current_period_start: periodStart,
          current_period_end: periodEnd,
          trial_end: trialEnd,
        })
        .select("id")
        .single();

      if (insertError) {
        return NextResponse.json(
          { error: "already_subscribed" },
          { status: 409 }
        );
      }
      subscriptionId = inserted!.id;
    }

    // クーポン redemption に subscription_id を紐付け
    if (couponId) {
      await supabase
        .from("coupon_redemptions")
        .update({ subscription_id: subscriptionId })
        .eq("user_id", userId)
        .eq("coupon_id", couponId);
    }

    return NextResponse.json({
      success: true,
      subscription_id: subscriptionId,
    });
  } catch (e) {
    // Pay.jp失敗 → クーポン予約ロールバック
    if (couponId) {
      await supabase
        .from("coupon_redemptions")
        .delete()
        .eq("user_id", userId)
        .eq("coupon_id", couponId);
      await supabase.rpc("decrement_coupon_usage", {
        p_coupon_id: couponId,
      });
    }
    const errCode = (e as { body?: { error?: { code?: string } } })?.body?.error?.code ?? "unknown";
    console.error(`Payment failed: code=${errCode}, userId=${userId}`);
    return NextResponse.json({ error: "決済に失敗しました。再度お試しください。" }, { status: 500 });
  }
}

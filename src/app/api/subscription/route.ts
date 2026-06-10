import { NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";


// GET: fetch current user's subscription + plan info
export async function GET() {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  // Get subscription with plan
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*, plan:plans(*)")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (sub) {
    return NextResponse.json(sub);
  }

  // No subscription: return default free plan
  const { data: freePlan } = await supabase
    .from("plans")
    .select("*")
    .eq("is_default", true)
    .single();

  return NextResponse.json({
    id: null,
    plan_id: freePlan?.id ?? "free",
    plan: freePlan,
    status: "active",
    free_until: null,
    coupon_id: null,
    stripe_subscription_id: null,
    stripe_customer_id: null,
    current_period_start: new Date().toISOString(),
    current_period_end: null,
  });
}

// POST: create or update subscription — only free plan allowed without payment verification
export async function POST(request: Request) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { plan_id, coupon_code } = await request.json();

  // Validate plan
  const { data: plan } = await supabase
    .from("plans")
    .select("*")
    .eq("id", plan_id)
    .single();

  if (!plan) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  // Block paid plan creation without payment verification
  if (plan.price > 0 && !coupon_code) {
    return NextResponse.json({ error: "Payment required for paid plans" }, { status: 402 });
  }

  // Validate coupon if provided
  let couponId = null;
  let freeUntil = null;

  if (coupon_code) {
    const { data: coupon } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", coupon_code)
      .eq("is_active", true)
      .single();

    if (!coupon) {
      return NextResponse.json({ error: "Invalid coupon code" }, { status: 400 });
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return NextResponse.json({ error: "Coupon expired" }, { status: 400 });
    }

    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      return NextResponse.json({ error: "Coupon usage limit reached" }, { status: 400 });
    }

    couponId = coupon.id;

    if (coupon.free_months > 0) {
      const freeDate = new Date();
      freeDate.setMonth(freeDate.getMonth() + coupon.free_months);
      freeUntil = freeDate.toISOString();
    }

    // Increment coupon usage
    await supabase
      .from("coupons")
      .update({ used_count: coupon.used_count + 1 })
      .eq("id", coupon.id);
  }

  // Cancel existing subscription
  await supabase
    .from("subscriptions")
    .update({ status: "canceled" })
    .eq("user_id", userId)
    .eq("status", "active");

  // Create new subscription
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const { data: sub, error } = await supabase
    .from("subscriptions")
    .insert({
      user_id: userId,
      plan_id,
      coupon_id: couponId,
      free_until: freeUntil,
      current_period_end: periodEnd.toISOString(),
    })
    .select("*, plan:plans(*)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(sub, { status: 201 });
}

import { NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { userId } = auth;

  const { code } = await req.json();
  if (!code) {
    return NextResponse.json({ error: "code required" }, { status: 400 });
  }

  const supabase = getAdminClient();
  const { data: coupon } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .eq("is_active", true)
    .single();

  if (!coupon) {
    return NextResponse.json({ error: "invalid_coupon" }, { status: 404 });
  }
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return NextResponse.json({ error: "coupon_expired" }, { status: 400 });
  }
  if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
    return NextResponse.json(
      { error: "coupon_maxed_out" },
      { status: 400 }
    );
  }

  // 既に使用済みチェック
  const { data: redemption } = await supabase
    .from("coupon_redemptions")
    .select("id")
    .eq("user_id", userId)
    .eq("coupon_id", coupon.id)
    .single();

  if (redemption) {
    return NextResponse.json(
      { error: "coupon_already_used" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    valid: true,
    discount_percent: coupon.discount_percent,
    free_months: coupon.free_months,
    free_days: coupon.free_months > 0 ? coupon.free_months * 30 : 0,
  });
}

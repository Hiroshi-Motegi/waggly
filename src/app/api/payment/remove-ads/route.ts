import { NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { createClient } from "@supabase/supabase-js";
import { getPayjpClient } from "@/lib/payjp";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  // レートリミット
  const ip = getClientIP(req);
  const { allowed } = checkRateLimit(`remove-ads:${ip}`, 5, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "リクエストが多すぎます。しばらくしてからお試しください。" },
      { status: 429 }
    );
  }

  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { userId } = auth;

  const { token, promo_code } = await req.json();
  if (!token || typeof token !== "string" || token.length > 100) {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }

  const supabase = getAdminClient();

  // 既に購入済みチェック
  const { data: user } = await supabase
    .from("users")
    .select("ad_free")
    .eq("id", userId)
    .single();

  if (user?.ad_free) {
    return NextResponse.json({ error: "既に広告非表示を購入済みです。" }, { status: 400 });
  }

  // プロモコード検証
  let amount = 100;
  if (promo_code && typeof promo_code === "string" && promo_code.length <= 50) {
    const { data: coupon } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", promo_code.trim().toUpperCase())
      .eq("is_active", true)
      .single();

    if (coupon) {
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        return NextResponse.json({ error: "コードの有効期限が切れています。" }, { status: 400 });
      }
      if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
        return NextResponse.json({ error: "コードは使い切られています。" }, { status: 400 });
      }
      // 既に使用済みチェック
      const { data: redemption } = await supabase
        .from("coupon_redemptions")
        .select("id")
        .eq("user_id", userId)
        .eq("coupon_id", coupon.id)
        .single();
      if (redemption) {
        return NextResponse.json({ error: "このコードは使用済みです。" }, { status: 400 });
      }

      amount = Math.round(amount * (1 - coupon.discount_percent / 100));

      // クーポン使用記録
      await supabase.from("coupon_redemptions").insert({
        user_id: userId,
        coupon_id: coupon.id,
      });
      await supabase.rpc("increment_coupon_usage", { p_coupon_id: coupon.id });
    }
  }

  // Pay.jp 単発チャージ（¥0 の場合はスキップ）
  if (amount > 0) {
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
        } catch (e: any) {
          if (e?.body?.error?.code !== "already_have_card") throw e;
        }
      } else {
        const customer = await getPayjpClient().customers.create({ card: token });
        customerId = customer.id;
      }

      await getPayjpClient().charges.create({
        amount,
        currency: "jpy",
        customer: customerId,
      });
    } catch {
      return NextResponse.json(
        { error: "決済に失敗しました。再度お試しください。" },
        { status: 500 }
      );
    }
  }

  // ad_free フラグを更新
  await supabase.from("users").update({ ad_free: true }).eq("id", userId);

  return NextResponse.json({ success: true });
}

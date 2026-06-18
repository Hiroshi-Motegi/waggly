import { NextResponse } from "next/server";
import { getApiAuth, getAdminClient, unauthorized } from "@/lib/supabase/api";
import { getPayjpClient } from "@/lib/payjp";

export async function GET() {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { userId } = auth;

  const supabase = getAdminClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("payjp_customer_id")
    .eq("user_id", userId)
    .not("payjp_customer_id", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (!sub?.payjp_customer_id) {
    return NextResponse.json({ card: null });
  }

  try {
    const customer = await getPayjpClient().customers.retrieve(sub.payjp_customer_id);
    const card = customer.cards?.data?.[0];
    if (!card) return NextResponse.json({ card: null });

    return NextResponse.json({
      card: {
        brand: card.brand,
        last4: card.last4,
        exp_month: card.exp_month,
        exp_year: card.exp_year,
      },
    });
  } catch {
    return NextResponse.json({ card: null });
  }
}

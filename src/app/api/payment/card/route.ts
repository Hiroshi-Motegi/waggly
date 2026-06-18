import { NextResponse } from "next/server";
import { getApiAuth, getAdminClient, unauthorized } from "@/lib/supabase/api";
import { getPayjpClient } from "@/lib/payjp";

export async function PATCH(req: Request) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { userId } = auth;

  const { token } = await req.json();
  if (!token || typeof token !== "string" || token.length > 100) {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }

  const supabase = getAdminClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("payjp_customer_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (!sub?.payjp_customer_id) {
    return NextResponse.json(
      { error: "no_active_subscription" },
      { status: 404 }
    );
  }

  await getPayjpClient().customers.update(sub.payjp_customer_id, { card: token });
  return NextResponse.json({ success: true });
}

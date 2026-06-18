import crypto from "crypto";
import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/api";

export async function POST(req: Request) {
  // 簡易認証（cron secret, タイミングセーフ比較）
  const authHeader = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : "";
  if (!authHeader || !expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const bufA = Buffer.from(authHeader);
  const bufB = Buffer.from(expected);
  if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = getAdminClient();
  const now = new Date().toISOString();

  // canceled → expired
  const { count: canceledCount } = await supabase
    .from("subscriptions")
    .update({ status: "expired" })
    .eq("status", "canceled")
    .lt("current_period_end", now);

  // grace_period 超過 → expired
  const { count: graceCount } = await supabase
    .from("subscriptions")
    .update({ status: "expired" })
    .eq("status", "active")
    .not("grace_period_end", "is", null)
    .lt("grace_period_end", now);

  // webhook_events クリーンアップ（90日）
  const cutoff = new Date(
    Date.now() - 90 * 24 * 60 * 60 * 1000
  ).toISOString();
  await supabase.from("webhook_events").delete().lt("processed_at", cutoff);

  return NextResponse.json({
    expired: (canceledCount ?? 0) + (graceCount ?? 0),
  });
}

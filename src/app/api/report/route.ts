import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/api";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { sendAdminEmail } from "@/lib/send-admin-email";
import { buildReportEmail } from "@/lib/email-templates";
import { withErrorHandler } from "@/lib/api-error";

export const POST = withErrorHandler(async (request: NextRequest) => {
  // 1. Rate limit
  const ip = getClientIP(request);
  const { allowed } = await checkRateLimit(`report:${ip}`, 3, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "送信回数の上限に達しました。しばらくしてからお試しください。" },
      { status: 429 }
    );
  }

  const body = await request.json();

  // 2. Turnstile verification
  if (!body.turnstileToken) {
    return NextResponse.json({ error: "認証に失敗しました" }, { status: 403 });
  }
  const turnstileOk = await verifyTurnstile(body.turnstileToken);
  if (!turnstileOk) {
    return NextResponse.json({ error: "認証に失敗しました" }, { status: 403 });
  }

  // 3. Validation
  const { reported_username, reason, detail, reporter_email } = body;
  if (!reported_username || !reason) {
    return NextResponse.json({ error: "必須項目を入力してください" }, { status: 400 });
  }
  const validReasons = ["inappropriate", "spam", "harassment", "other"];
  if (!validReasons.includes(reason)) {
    return NextResponse.json({ error: "無効な理由です" }, { status: 400 });
  }

  // 4. Verify reported_username exists
  const supabase = getAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", reported_username)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "指定されたユーザーが見つかりません" }, { status: 400 });
  }

  // 5. Insert into DB
  const { error } = await supabase.from("reports").insert({
    reported_username,
    reason,
    detail: detail || null,
    reporter_email: reporter_email || null,
  });

  if (error) {
    console.error("Failed to insert report:", error);
    return NextResponse.json({ error: "送信に失敗しました" }, { status: 500 });
  }

  // 6. Send email notification
  const { subject, html } = buildReportEmail({
    reported_username,
    reason,
    detail: detail || null,
    reporter_email: reporter_email || null,
  });
  await sendAdminEmail(subject, html);

  return NextResponse.json({ success: true }, { status: 201 });
});

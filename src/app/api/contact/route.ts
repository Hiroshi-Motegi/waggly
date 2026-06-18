import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getApiAuth } from "@/lib/supabase/api";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { sendAdminEmail } from "@/lib/send-admin-email";
import { buildInquiryEmail } from "@/lib/email-templates";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  // 1. Rate limit
  const ip = getClientIP(request);
  const { allowed } = await checkRateLimit(`contact:${ip}`, 3, 60_000);
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
  const { name, email, category, message } = body;
  if (!email || !category || !message) {
    return NextResponse.json({ error: "必須項目を入力してください" }, { status: 400 });
  }
  const validCategories = ["bug", "feature", "question", "other"];
  if (!validCategories.includes(category)) {
    return NextResponse.json({ error: "無効なカテゴリです" }, { status: 400 });
  }

  // 4. Check auth (optional)
  let userId: string | null = null;
  try {
    const auth = await getApiAuth();
    if (auth) userId = auth.userId;
  } catch {
    // Not authenticated — that's fine
  }

  // 5. Insert into DB
  const supabase = getAdminClient();
  const { error } = await supabase.from("inquiries").insert({
    user_id: userId,
    name: userId ? null : name,
    email,
    category,
    message,
  });

  if (error) {
    console.error("Failed to insert inquiry:", error);
    return NextResponse.json({ error: "送信に失敗しました" }, { status: 500 });
  }

  // 6. Send email notification
  const { subject, html } = buildInquiryEmail({
    name: userId ? null : name,
    email,
    category,
    message,
    user_id: userId,
  });
  await sendAdminEmail(subject, html);

  return NextResponse.json({ success: true }, { status: 201 });
}

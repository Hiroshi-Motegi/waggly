import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getApiAuth } from "@/lib/supabase/api";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { sendAdminEmail } from "@/lib/send-admin-email";
import { buildInquiryEmail } from "@/lib/email-templates";
import { contactSchema } from "@/lib/api-schemas";

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

  const raw = await request.json();

  // 2. Validate input
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "必須項目を入力してください" }, { status: 400 });
  }
  const { turnstileToken, name: rawName, email, category, message } = parsed.data;
  const name = rawName ?? null;

  // 3. Turnstile verification
  const turnstileOk = await verifyTurnstile(turnstileToken);
  if (!turnstileOk) {
    return NextResponse.json({ error: "認証に失敗しました" }, { status: 403 });
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

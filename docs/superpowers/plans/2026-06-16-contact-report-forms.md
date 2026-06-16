# お問い合わせ・通報フォーム 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** お問い合わせフォーム(`/help/contact`)と通報フォーム(`/report`)を作成し、DB保存 + Resendでメール通知する

**Architecture:** Next.js API Routes でフォーム送信を受け付け、Supabaseサービスロールで inquiries/reports テーブルに保存、Resend で管理者にHTMLメール通知。スパム対策に Cloudflare Turnstile、簡易レート制限をインメモリMapで実装。

**Tech Stack:** Next.js 16, Supabase, Resend, Cloudflare Turnstile (`@marsidev/react-turnstile`)

---

## ファイル構成

| ファイル | 責務 |
|---------|------|
| `supabase/migrations/208_contact_report.sql` | inquiries, reports テーブル作成 |
| `src/types/database.ts` | Inquiry, Report 型追加 |
| `src/lib/rate-limit.ts` | インメモリIPベースレート制限 |
| `src/lib/turnstile.ts` | Turnstileトークン検証 |
| `src/lib/send-admin-email.ts` | Resend経由の管理者メール送信 |
| `src/lib/email-templates.ts` | メールHTML生成ヘルパー |
| `src/app/api/contact/route.ts` | お問い合わせ POST API |
| `src/app/api/report/route.ts` | 通報 POST API |
| `src/app/help/contact/page.tsx` | お問い合わせフォーム（既存改修） |
| `src/app/help/contact/complete/page.tsx` | お問い合わせ送信完了 |
| `src/app/report/page.tsx` | 通報フォーム |
| `src/app/report/complete/page.tsx` | 通報送信完了 |
| `src/app/p/[username]/page-client.tsx` | フッター通報リンク変更 |

---

### Task 1: パッケージ追加 + DB マイグレーション + 型定義

**Files:**
- Create: `supabase/migrations/208_contact_report.sql`
- Modify: `src/types/database.ts`
- Modify: `package.json`

- [ ] **Step 1: パッケージインストール**

```bash
npm install resend @marsidev/react-turnstile
```

- [ ] **Step 2: マイグレーションファイル作成**

`supabase/migrations/208_contact_report.sql`:

```sql
CREATE TABLE inquiries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  name text,
  email text NOT NULL,
  category text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_inquiries_status ON inquiries(status);

ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON inquiries
  FOR ALL USING (false);

CREATE TABLE reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reported_username text NOT NULL,
  reason text NOT NULL,
  detail text,
  reporter_email text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_reports_status ON reports(status);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON reports
  FOR ALL USING (false);
```

- [ ] **Step 3: マイグレーション実行**

```bash
npx supabase db push
```

- [ ] **Step 4: 型定義を追加**

`src/types/database.ts` の末尾（`FavoriteCourse` インターフェースの後）に追加:

```typescript
export interface Inquiry {
  id: string;
  user_id: string | null;
  name: string | null;
  email: string;
  category: 'bug' | 'feature' | 'question' | 'other';
  message: string;
  status: 'open' | 'in_progress' | 'closed';
  created_at: string;
}

export interface Report {
  id: string;
  reported_username: string;
  reason: 'inappropriate' | 'spam' | 'harassment' | 'other';
  detail: string | null;
  reporter_email: string | null;
  status: 'open' | 'in_progress' | 'closed';
  created_at: string;
}
```

- [ ] **Step 5: コミット**

```bash
git add supabase/migrations/208_contact_report.sql src/types/database.ts package.json package-lock.json
git commit -m "feat: add inquiries/reports tables and types"
```

---

### Task 2: レート制限 + Turnstile検証

**Files:**
- Create: `src/lib/rate-limit.ts`
- Create: `src/lib/turnstile.ts`

- [ ] **Step 1: レート制限ユーティリティ作成**

`src/lib/rate-limit.ts`:

```typescript
const store = new Map<string, { count: number; resetAt: number }>();

/**
 * Check rate limit for a given key (typically IP address).
 * Returns true if the request is allowed, false if rate-limited.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 3,
  windowMs: number = 60_000
): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}
```

- [ ] **Step 2: Turnstile検証ユーティリティ作成**

`src/lib/turnstile.ts`:

```typescript
/**
 * Verify a Cloudflare Turnstile token server-side.
 * Returns true if valid, false otherwise.
 */
export async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error("TURNSTILE_SECRET_KEY is not set");
    return false;
  }

  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    }
  );

  const data = await res.json();
  return data.success === true;
}
```

- [ ] **Step 3: コミット**

```bash
git add src/lib/rate-limit.ts src/lib/turnstile.ts
git commit -m "feat: add rate limiter and Turnstile verification"
```

---

### Task 3: メール送信 + テンプレート

**Files:**
- Create: `src/lib/send-admin-email.ts`
- Create: `src/lib/email-templates.ts`

- [ ] **Step 1: メール送信関数作成**

`src/lib/send-admin-email.ts`:

```typescript
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const ADMIN_EMAIL = "apps@cocoroe.me";
const FROM_EMAIL = "Waggly <onboarding@resend.dev>";

/**
 * Send an HTML email to the admin.
 * Logs errors but does not throw — form submission should succeed
 * even if email delivery fails.
 */
export async function sendAdminEmail(
  subject: string,
  html: string
): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject,
      html,
    });
  } catch (error) {
    console.error("Failed to send admin email:", error);
  }
}
```

- [ ] **Step 2: メールテンプレート作成**

`src/lib/email-templates.ts`:

```typescript
const CATEGORY_LABELS: Record<string, string> = {
  bug: "不具合",
  feature: "機能要望",
  question: "質問",
  other: "その他",
};

const REASON_LABELS: Record<string, string> = {
  inappropriate: "不適切なコンテンツ",
  spam: "スパム",
  harassment: "嫌がらせ",
  other: "その他",
};

export function buildInquiryEmail(inquiry: {
  name: string | null;
  email: string;
  category: string;
  message: string;
  user_id: string | null;
}): { subject: string; html: string } {
  const categoryLabel = CATEGORY_LABELS[inquiry.category] ?? inquiry.category;
  return {
    subject: `[Waggly] 新しいお問い合わせ: ${categoryLabel}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #006728;">新しいお問い合わせ</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">カテゴリ</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${categoryLabel}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">名前</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(inquiry.name ?? "(ログインユーザー)")}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">メール</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(inquiry.email)}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">ユーザーID</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${inquiry.user_id ?? "(未ログイン)"}</td></tr>
        </table>
        <h3 style="margin-top: 20px;">内容</h3>
        <p style="white-space: pre-wrap; background: #f9f9f9; padding: 12px; border-radius: 8px;">${escapeHtml(inquiry.message)}</p>
      </div>
    `,
  };
}

export function buildReportEmail(report: {
  reported_username: string;
  reason: string;
  detail: string | null;
  reporter_email: string | null;
}): { subject: string; html: string } {
  const reasonLabel = REASON_LABELS[report.reason] ?? report.reason;
  return {
    subject: `[Waggly] 新しい通報: ${report.reported_username}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #c53030;">新しい通報</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">対象ユーザー</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(report.reported_username)}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">理由</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${reasonLabel}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">通報者メール</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(report.reporter_email ?? "(未入力)")}</td></tr>
        </table>
        ${report.detail ? `<h3 style="margin-top: 20px;">詳細</h3><p style="white-space: pre-wrap; background: #f9f9f9; padding: 12px; border-radius: 8px;">${escapeHtml(report.detail)}</p>` : ""}
      </div>
    `,
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
```

- [ ] **Step 3: コミット**

```bash
git add src/lib/send-admin-email.ts src/lib/email-templates.ts
git commit -m "feat: add admin email sender and HTML templates"
```

---

### Task 4: お問い合わせ API

**Files:**
- Create: `src/app/api/contact/route.ts`

- [ ] **Step 1: API ルート作成**

`src/app/api/contact/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getApiAuth } from "@/lib/supabase/api";
import { checkRateLimit } from "@/lib/rate-limit";
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
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`contact:${ip}`)) {
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

  // 4. Check auth (optional — non-logged-in users can also submit)
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
```

- [ ] **Step 2: コミット**

```bash
git add src/app/api/contact/route.ts
git commit -m "feat: add contact inquiry API endpoint"
```

---

### Task 5: 通報 API

**Files:**
- Create: `src/app/api/report/route.ts`

- [ ] **Step 1: API ルート作成**

`src/app/api/report/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { sendAdminEmail } from "@/lib/send-admin-email";
import { buildReportEmail } from "@/lib/email-templates";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  // 1. Rate limit
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`report:${ip}`)) {
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
}
```

- [ ] **Step 2: コミット**

```bash
git add src/app/api/report/route.ts
git commit -m "feat: add content report API endpoint"
```

---

### Task 6: お問い合わせフォームページ

**Files:**
- Modify: `src/app/help/contact/page.tsx`
- Create: `src/app/help/contact/complete/page.tsx`

- [ ] **Step 1: お問い合わせフォームに改修**

`src/app/help/contact/page.tsx` を以下で置き換え:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { useProfile } from "@/hooks/use-profile";
import { validateForm, type ValidationSchema } from "@/lib/form-validation";
import { Turnstile } from "@marsidev/react-turnstile";
import { Loader2 } from "lucide-react";

const CATEGORIES = [
  { value: "bug", label: "不具合" },
  { value: "feature", label: "機能要望" },
  { value: "question", label: "質問" },
  { value: "other", label: "その他" },
];

const contactSchema: ValidationSchema = {
  email: {
    required: "メールアドレスを入力してください",
    pattern: {
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: "有効なメールアドレスを入力してください",
    },
  },
  category: { required: "カテゴリを選択してください" },
  message: {
    required: "お問い合わせ内容を入力してください",
    maxLength: { value: 2000, message: "2000文字以内で入力してください" },
  },
};

const nameSchema: ValidationSchema = {
  name: { required: "お名前を入力してください" },
};

const inputClass =
  "w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]";

export default function ContactPage() {
  const router = useRouter();
  const { profile } = useProfile();
  const isLoggedIn = !!profile;

  const [form, setForm] = useState({
    name: "",
    email: "",
    category: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Validate
    const schema = isLoggedIn ? contactSchema : { ...contactSchema, ...nameSchema };
    const validationErrors = validateForm(form, schema);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (!turnstileToken) {
      setSubmitError("認証を完了してください");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          name: isLoggedIn ? null : form.name,
          turnstileToken,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSubmitError(data.error ?? "送信に失敗しました");
        return;
      }

      router.push("/help/contact/complete");
    } catch {
      setSubmitError("送信に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2">
      <PageHeader title="お問い合わせ" variant="dark" />

      <form onSubmit={handleSubmit} className="space-y-2">
        {/* 名前 (未ログイン時) or ニックネーム表示 (ログイン時) */}
        <div className="rounded-lg bg-white p-4">
          {isLoggedIn ? (
            <div>
              <label className="text-sm font-bold text-[#8b8b8b]">ユーザー</label>
              <p className="mt-1 text-base">{profile.nickname ?? profile.display_name ?? "ユーザー"}</p>
            </div>
          ) : (
            <div>
              <label className="text-sm font-bold text-[#8b8b8b]">
                お名前 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                className={inputClass}
                placeholder="お名前"
              />
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
            </div>
          )}
        </div>

        {/* メールアドレス */}
        <div className="rounded-lg bg-white p-4">
          <label className="text-sm font-bold text-[#8b8b8b]">
            メールアドレス <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            className={inputClass}
            placeholder="example@email.com"
          />
          {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
          <p className="text-xs text-[#8b8b8b] mt-1">返信先として使用します</p>
        </div>

        {/* カテゴリ */}
        <div className="rounded-lg bg-white p-4">
          <label className="text-sm font-bold text-[#8b8b8b]">
            カテゴリ <span className="text-red-500">*</span>
          </label>
          <select
            value={form.category}
            onChange={(e) => updateField("category", e.target.value)}
            className={inputClass}
          >
            <option value="">選択してください</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          {errors.category && <p className="text-sm text-red-500 mt-1">{errors.category}</p>}
        </div>

        {/* お問い合わせ内容 */}
        <div className="rounded-lg bg-white p-4">
          <label className="text-sm font-bold text-[#8b8b8b]">
            お問い合わせ内容 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={form.message}
            onChange={(e) => updateField("message", e.target.value)}
            className={`${inputClass} min-h-[120px] resize-y`}
            placeholder="お問い合わせ内容をご記入ください"
          />
          {errors.message && <p className="text-sm text-red-500 mt-1">{errors.message}</p>}
        </div>

        {/* Turnstile */}
        <div className="flex justify-center">
          <Turnstile
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
            onSuccess={setTurnstileToken}
          />
        </div>

        {/* エラー表示 */}
        {submitError && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
            {submitError}
          </div>
        )}

        {/* 送信ボタン */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-[#006728] py-3 text-base font-bold text-white disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          ) : (
            "送信する"
          )}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: 送信完了ページ作成**

`src/app/help/contact/complete/page.tsx`:

```typescript
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { CheckCircle } from "lucide-react";

export default function ContactCompletePage() {
  const router = useRouter();

  // Prevent direct access — redirect if no referrer from contact form
  useEffect(() => {
    const referrer = document.referrer;
    if (!referrer || !referrer.includes("/help/contact")) {
      router.replace("/help/contact");
    }
  }, [router]);

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2">
      <PageHeader title="お問い合わせ" variant="dark" />

      <div className="rounded-lg bg-white p-8 text-center space-y-4">
        <CheckCircle className="mx-auto h-12 w-12 text-[#006728]" />
        <h2 className="text-lg font-bold">お問い合わせを受け付けました</h2>
        <p className="text-base text-[#8b8b8b]">
          2〜3営業日以内にご連絡いたします。
        </p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 rounded-lg bg-[#006728] px-6 py-3 text-base font-bold text-white"
        >
          トップへ戻る
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 動作確認**

ブラウザで `/help/contact` にアクセスし、以下を確認:
- 未ログイン: 名前 + メアド + カテゴリ + 内容フォームが表示される
- ログイン: ニックネーム表示 + メアド + カテゴリ + 内容フォームが表示される
- バリデーションが動作する（空送信でエラー表示）

- [ ] **Step 4: コミット**

```bash
git add src/app/help/contact/page.tsx src/app/help/contact/complete/page.tsx
git commit -m "feat: convert contact page to form with completion page"
```

---

### Task 7: 通報フォームページ

**Files:**
- Create: `src/app/report/page.tsx`
- Create: `src/app/report/complete/page.tsx`

- [ ] **Step 1: 通報フォーム作成**

`src/app/report/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { validateForm, type ValidationSchema } from "@/lib/form-validation";
import { Turnstile } from "@marsidev/react-turnstile";
import { Loader2 } from "lucide-react";

const REASONS = [
  { value: "inappropriate", label: "不適切なコンテンツ" },
  { value: "spam", label: "スパム" },
  { value: "harassment", label: "嫌がらせ" },
  { value: "other", label: "その他" },
];

const reportSchema: ValidationSchema = {
  reason: { required: "理由を選択してください" },
};

const inputClass =
  "w-full rounded-lg border border-[#c4c4c4] bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#006728]";

export default function ReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const username = searchParams.get("username") ?? "";

  const [form, setForm] = useState({
    reason: "",
    detail: "",
    reporter_email: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!username) {
    return (
      <div className="relative flex flex-col px-2 py-2 space-y-2">
        <PageHeader title="通報" variant="dark" />
        <div className="rounded-lg bg-white p-4 text-center">
          <p className="text-base text-[#8b8b8b]">通報対象が指定されていません。</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const validationErrors = validateForm(form, reportSchema);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (!turnstileToken) {
      setSubmitError("認証を完了してください");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reported_username: username,
          ...form,
          turnstileToken,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSubmitError(data.error ?? "送信に失敗しました");
        return;
      }

      router.push("/report/complete");
    } catch {
      setSubmitError("送信に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2">
      <PageHeader title="通報" variant="dark" />

      <form onSubmit={handleSubmit} className="space-y-2">
        {/* 通報対象 */}
        <div className="rounded-lg bg-white p-4">
          <label className="text-sm font-bold text-[#8b8b8b]">通報対象ユーザー</label>
          <p className="mt-1 text-base font-bold">{username}</p>
        </div>

        {/* 理由 */}
        <div className="rounded-lg bg-white p-4">
          <label className="text-sm font-bold text-[#8b8b8b]">
            理由 <span className="text-red-500">*</span>
          </label>
          <select
            value={form.reason}
            onChange={(e) => updateField("reason", e.target.value)}
            className={inputClass}
          >
            <option value="">選択してください</option>
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          {errors.reason && <p className="text-sm text-red-500 mt-1">{errors.reason}</p>}
        </div>

        {/* 詳細 */}
        <div className="rounded-lg bg-white p-4">
          <label className="text-sm font-bold text-[#8b8b8b]">詳細（任意）</label>
          <textarea
            value={form.detail}
            onChange={(e) => updateField("detail", e.target.value)}
            className={`${inputClass} min-h-[100px] resize-y`}
            placeholder="具体的な内容があればご記入ください"
          />
        </div>

        {/* メールアドレス */}
        <div className="rounded-lg bg-white p-4">
          <label className="text-sm font-bold text-[#8b8b8b]">メールアドレス（任意）</label>
          <input
            type="email"
            value={form.reporter_email}
            onChange={(e) => updateField("reporter_email", e.target.value)}
            className={inputClass}
            placeholder="対応結果の返信を希望する場合"
          />
        </div>

        {/* Turnstile */}
        <div className="flex justify-center">
          <Turnstile
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
            onSuccess={setTurnstileToken}
          />
        </div>

        {/* エラー表示 */}
        {submitError && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
            {submitError}
          </div>
        )}

        {/* 送信ボタン */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-[#c53030] py-3 text-base font-bold text-white disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          ) : (
            "通報する"
          )}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: 通報送信完了ページ作成**

`src/app/report/complete/page.tsx`:

```typescript
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { CheckCircle } from "lucide-react";

export default function ReportCompletePage() {
  const router = useRouter();

  useEffect(() => {
    const referrer = document.referrer;
    if (!referrer || !referrer.includes("/report")) {
      router.replace("/report");
    }
  }, [router]);

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2">
      <PageHeader title="通報" variant="dark" />

      <div className="rounded-lg bg-white p-8 text-center space-y-4">
        <CheckCircle className="mx-auto h-12 w-12 text-[#006728]" />
        <h2 className="text-lg font-bold">通報を受け付けました</h2>
        <p className="text-base text-[#8b8b8b]">
          内容を確認の上、対応いたします。
        </p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 rounded-lg bg-[#006728] px-6 py-3 text-base font-bold text-white"
        >
          トップへ戻る
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 動作確認**

ブラウザで `/report?username=waglin` にアクセスし、以下を確認:
- 通報対象ユーザー名「waglin」が表示される
- `?username` なしでアクセスすると「通報対象が指定されていません」表示
- 理由選択 + 詳細 + メール入力フォームが表示される

- [ ] **Step 4: コミット**

```bash
git add src/app/report/page.tsx src/app/report/complete/page.tsx
git commit -m "feat: add report form and completion page"
```

---

### Task 8: 名刺ページフッター変更

**Files:**
- Modify: `src/app/p/[username]/page-client.tsx:537-545`

- [ ] **Step 1: フッターの通報リンクを変更**

`src/app/p/[username]/page-client.tsx` のフッター部分を変更。

変更前:
```typescript
            <div className="flex items-center gap-1 pt-2">
              <span className="text-sm text-white/70">不適切なコンテンツの通報:</span>
              <img src="/images/email.svg" alt="メールアドレス" className="h-5 opacity-70 invert" />
            </div>
```

変更後（`username` はコンポーネント内で利用可能な `profile.username` から取得）:
```typescript
            <div className="pt-2">
              <a
                href={`/report?username=${profile.username}`}
                className="text-sm text-white/70 underline"
              >
                不適切なコンテンツを通報
              </a>
            </div>
```

`profile.username` が利用可能か確認すること。名刺ページなので `username` はURLパラメータまたは `profile` オブジェクトから取得できるはず。コンポーネント内の実際の変数名に合わせて調整。

- [ ] **Step 2: 動作確認**

ブラウザで名刺ページ（例: `/p/waglin`）を開き:
- フッターに「不適切なコンテンツを通報」リンクが表示される
- クリックすると `/report?username=waglin` に遷移する

- [ ] **Step 3: コミット**

```bash
git add src/app/p/[username]/page-client.tsx
git commit -m "feat: replace email display with report form link in profile footer"
```

---

### Task 9: 環境変数設定 + E2E動作確認

**Files:** なし（設定のみ）

- [ ] **Step 1: 環境変数を `.env.local` に追加**

```
RESEND_API_KEY=re_xxxxxxxxx
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAA...
TURNSTILE_SECRET_KEY=0x4AAAAAAA...
```

Turnstileのテスト用キー（開発環境用）:
- Site Key: `1x00000000000000000000AA`（常に成功）
- Secret Key: `1x0000000000000000000000000000000AA`（常に成功）

- [ ] **Step 2: E2E動作確認 — お問い合わせ**

1. `/help/contact` にアクセス
2. 未ログイン状態で名前 + メール + カテゴリ + 内容を入力
3. 送信 → `/help/contact/complete` に遷移
4. Supabase の `inquiries` テーブルにレコードが作成されていることを確認
5. `apps@cocoroe.me` にメールが届くことを確認（Resend API キーが本番の場合）

- [ ] **Step 3: E2E動作確認 — 通報**

1. `/p/waglin` の名刺ページからフッターの通報リンクをクリック
2. `/report?username=waglin` に遷移
3. 理由を選択して送信
4. `/report/complete` に遷移
5. Supabase の `reports` テーブルにレコードが作成されていることを確認

- [ ] **Step 4: エッジケース確認**

- `/report` に `?username` なしでアクセス → 「通報対象が指定されていません」表示
- `/report?username=nonexistent` で送信 → 400 エラー表示
- `/help/contact/complete` に直接アクセス → `/help/contact` にリダイレクト
- `/report/complete` に直接アクセス → `/report` にリダイレクト

- [ ] **Step 5: ビルド確認**

```bash
npm run build
```

Expected: ビルド成功、エラーなし

- [ ] **Step 6: コミット（環境変数テンプレート等があれば）**

環境変数はコミットしない（`.env.local` は `.gitignore` 済み）。

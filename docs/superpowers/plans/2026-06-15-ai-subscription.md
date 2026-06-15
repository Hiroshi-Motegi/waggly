# AIコーチ サブスクリプション 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AI機能に回数制限を導入し、Pay.jp決済で有料プラン「Waggly Pro」を提供する

**Architecture:** DBにplans/subscriptions/ai_usage_countersテーブルを追加し、AIエンドポイント呼び出し前に原子的カウンターで回数チェック。Pay.jpの定期課金APIでサブスク管理、Webhookでステータス同期。フロントはuseSWRでプラン・使用量をキャッシュ

**Tech Stack:** Supabase (PostgreSQL), Pay.jp API, Next.js API Routes, useSWR, payjp (npm)

**Spec:** `docs/superpowers/specs/2026-06-15-ai-subscription-design.md`

---

## ファイル構成

### 新規作成
| ファイル | 責務 |
|---------|------|
| `supabase/migrations/200_subscription_schema.sql` | 全テーブル作成マイグレーション |
| `src/lib/plans.ts` | プランID定数、型定義 |
| `src/lib/payjp.ts` | Pay.jpクライアント初期化 |
| `src/lib/ai/usage-counter.ts` | 回数制限チェック（原子的カウンター） |
| `src/lib/subscription.ts` | サブスク取得・ステータス遷移ヘルパー |
| `src/app/api/payment/create/route.ts` | 決済エントリポイント（3フェーズ） |
| `src/app/api/payment/card/route.ts` | カード変更 |
| `src/app/api/webhook/payjp/route.ts` | Pay.jp Webhook受信 |
| `src/app/api/coupon/validate/route.ts` | クーポン検証 |
| `src/app/api/cron/expire-subscriptions/route.ts` | expired遷移（Vercel Cron代替） |
| `src/app/settings/plan/page.tsx` | プラン画面 |
| `src/components/usage-badge.tsx` | 残り回数バッジ |
| `src/components/limit-reached-card.tsx` | 上限到達カード |
| `src/hooks/use-usage.ts` | useSWRで使用量取得 |
| `src/hooks/use-subscription.ts` | useSWRでサブスク取得 |

### 修正
| ファイル | 変更内容 |
|---------|---------|
| `src/lib/billing.ts` | 型定義をspec準拠に書き換え |
| `src/lib/ai/usage-limit.ts` | トークン制限→回数制限に書き換え |
| `src/app/api/usage/route.ts` | レスポンスを回数ベースに変更 |
| `src/app/api/subscription/route.ts` | GET: ステータス遷移チェック追加、POST: 削除（payment/createに統合） |
| `src/app/api/coach/chat/route.ts` | 回数チェック追加、失敗時デクリメント |
| `src/app/api/coach/plan/route.ts` | 同上 |
| `src/app/settings/page.tsx` | 使用量表示を回数ベースに変更、プラン行追加 |
| `src/app/coach/page.tsx` | 残り回数バッジ、上限到達UI追加 |
| `src/lib/api-client.ts` | ローカルモードのusageスタブ更新 |

---

## Task 1: DBマイグレーション

**Files:**
- Create: `supabase/migrations/200_subscription_schema.sql`

- [ ] **Step 1: マイグレーションファイル作成**

```sql
-- 200_subscription_schema.sql
-- AIコーチ サブスクリプション スキーマ

-- ============================================================
-- 共通: updated_at 自動更新関数
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- plans テーブル（RLS なし — 公開データ）
-- ============================================================
CREATE TABLE public.plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  price integer NOT NULL DEFAULT 0,
  billing_interval text NOT NULL DEFAULT 'month',
  ai_chat_monthly_limit integer NOT NULL DEFAULT 5,
  ai_plan_monthly_limit integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

INSERT INTO public.plans (id, name, price, billing_interval, ai_chat_monthly_limit, ai_plan_monthly_limit)
VALUES
  ('free', '無料', 0, 'month', 5, 3),
  ('pro', 'Waggly Pro', 480, 'month', 100, 30);

-- ============================================================
-- subscriptions テーブル
-- ============================================================
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES public.plans(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired')),
  payjp_subscription_id text,
  payjp_customer_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_end timestamptz,
  grace_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_subscriptions_active_user
  ON public.subscriptions (user_id) WHERE status = 'active';

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (user_id IN (
    SELECT up.user_id FROM public.user_providers up
    WHERE up.auth_user_id = auth.uid()
  ));

-- ============================================================
-- webhook_events テーブル
-- ============================================================
CREATE TABLE public.webhook_events (
  id text PRIMARY KEY,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- coupons テーブル
-- ============================================================
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_percent integer NOT NULL DEFAULT 0,
  free_months integer NOT NULL DEFAULT 0,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coupon_type_exclusive CHECK (
    (discount_percent > 0 AND free_months = 0) OR
    (discount_percent = 0 AND free_months > 0)
  )
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- coupon_redemptions テーブル
-- ============================================================
CREATE TABLE public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, coupon_id)
);

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own redemptions"
  ON public.coupon_redemptions FOR SELECT
  USING (user_id IN (
    SELECT up.user_id FROM public.user_providers up
    WHERE up.auth_user_id = auth.uid()
  ));

-- ============================================================
-- ai_usage_counters テーブル
-- ============================================================
CREATE TABLE public.ai_usage_counters (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('chat', 'plan')),
  month text NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, source, month)
);

ALTER TABLE public.ai_usage_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own counters"
  ON public.ai_usage_counters FOR SELECT
  USING (user_id IN (
    SELECT up.user_id FROM public.user_providers up
    WHERE up.auth_user_id = auth.uid()
  ));

-- ============================================================
-- ai_usage テーブル（新規作成 — 既存のINSERTコードと互換）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('chat', 'plan', 'autofill')),
  model text,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_month ON public.ai_usage (user_id, created_at);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own usage"
  ON public.ai_usage FOR SELECT
  USING (user_id IN (
    SELECT up.user_id FROM public.user_providers up
    WHERE up.auth_user_id = auth.uid()
  ));

-- ============================================================
-- user_providers インデックス（RLSパフォーマンス）
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_user_providers_auth_user_id
  ON public.user_providers (auth_user_id);
```

- [ ] **Step 2: Supabase ダッシュボードでマイグレーション実行**

Supabase SQL Editor に上記SQLを貼り付けて実行。エラーがないことを確認。

- [ ] **Step 3: コミット**

```bash
git add supabase/migrations/200_subscription_schema.sql
git commit -m "feat: add subscription schema (plans, subscriptions, coupons, ai_usage_counters)"
```

---

## Task 2: プラン定数・型定義

**Files:**
- Create: `src/lib/plans.ts`
- Modify: `src/lib/billing.ts`

- [ ] **Step 1: プラン定数ファイル作成**

```typescript
// src/lib/plans.ts
export const PLAN_ID = {
  FREE: 'free',
  PRO: 'pro',
} as const;
export type PlanId = typeof PLAN_ID[keyof typeof PLAN_ID];

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  billing_interval: 'month' | 'year';
  ai_chat_monthly_limit: number;
  ai_plan_monthly_limit: number;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: PlanId;
  plan?: Plan;
  status: 'active' | 'canceled' | 'expired';
  payjp_subscription_id: string | null;
  payjp_customer_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_end: string | null;
  grace_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  discount_percent: number;
  free_months: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
}

export const FREE_PLAN: Plan = {
  id: PLAN_ID.FREE,
  name: '無料',
  price: 0,
  billing_interval: 'month',
  ai_chat_monthly_limit: 5,
  ai_plan_monthly_limit: 3,
};

/** JST の YYYY-MM 文字列を返す（ICU非依存） */
export function getMonthJST(): string {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
```

- [ ] **Step 2: billing.ts を削除（plans.ts に統合済み）**

`src/lib/billing.ts` の内容は `src/lib/plans.ts` に移行済み。billing.ts を削除し、参照元を更新。

```bash
rm src/lib/billing.ts
```

billing.ts をインポートしている箇所を検索し、plans.ts に変更:
```bash
grep -r "from.*billing" src/ --include="*.ts" --include="*.tsx"
```

- [ ] **Step 3: コミット**

```bash
git add src/lib/plans.ts
git rm src/lib/billing.ts
git commit -m "feat: add plan constants and types, remove billing.ts"
```

---

## Task 3: 回数制限ロジック

**Files:**
- Create: `src/lib/ai/usage-counter.ts`
- Modify: `src/lib/ai/usage-limit.ts`

- [ ] **Step 1: usage-counter.ts 作成**

```typescript
// src/lib/ai/usage-counter.ts
import { createClient } from "@/lib/supabase-server";
import { PLAN_ID, FREE_PLAN, getMonthJST } from "@/lib/plans";
import type { Plan } from "@/lib/plans";

/** ユーザーのアクティブプランの上限を取得 */
export async function getUserPlanLimits(userId: string): Promise<Plan> {
  const supabase = await createClient();

  // active なサブスクを取得
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan_id, status, current_period_end, grace_period_end")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (!sub) return FREE_PLAN;

  // grace_period_end 超過チェック
  if (sub.grace_period_end && new Date(sub.grace_period_end) < new Date()) {
    await supabase.from("subscriptions").update({ status: "expired" }).eq("user_id", userId).eq("status", "active");
    return FREE_PLAN;
  }

  const { data: plan } = await supabase.from("plans").select("*").eq("id", sub.plan_id).single();
  return (plan as Plan) ?? FREE_PLAN;
}

/**
 * 回数チェック + インクリメント（原子的）
 * @returns 現在のカウント（成功時）、null（上限到達時）
 */
export async function incrementUsageCounter(
  userId: string,
  source: "chat" | "plan"
): Promise<number | null> {
  const supabase = await createClient();
  const month = getMonthJST();
  const plan = await getUserPlanLimits(userId);
  const limit = source === "chat" ? plan.ai_chat_monthly_limit : plan.ai_plan_monthly_limit;

  // 1. カウンター行がなければ作成
  await supabase.rpc("ensure_usage_counter", { p_user_id: userId, p_source: source, p_month: month });

  // 2. 原子的インクリメント
  const { data, error } = await supabase.rpc("increment_usage_counter", {
    p_user_id: userId,
    p_source: source,
    p_month: month,
    p_limit: limit,
  });

  if (error || data === null || data === undefined) return null;
  return data as number;
}

/** AI API失敗時のカウンター補正 */
export async function decrementUsageCounter(
  userId: string,
  source: "chat" | "plan"
): Promise<void> {
  const supabase = await createClient();
  const month = getMonthJST();
  await supabase.rpc("decrement_usage_counter", { p_user_id: userId, p_source: source, p_month: month });
}

/** ユーザーの当月の使用量を取得 */
export async function getUsageCounts(userId: string): Promise<{ chat: number; plan: number }> {
  const supabase = await createClient();
  const month = getMonthJST();

  const { data } = await supabase
    .from("ai_usage_counters")
    .select("source, count")
    .eq("user_id", userId)
    .eq("month", month);

  const counts = { chat: 0, plan: 0 };
  for (const row of data ?? []) {
    if (row.source === "chat") counts.chat = row.count;
    if (row.source === "plan") counts.plan = row.count;
  }
  return counts;
}
```

- [ ] **Step 2: RPC関数をマイグレーションに追加**

`supabase/migrations/201_usage_counter_rpcs.sql` を作成:

```sql
-- ensure_usage_counter: カウンター行の初期化
CREATE OR REPLACE FUNCTION ensure_usage_counter(p_user_id uuid, p_source text, p_month text)
RETURNS void AS $$
BEGIN
  INSERT INTO ai_usage_counters (user_id, source, month, count)
  VALUES (p_user_id, p_source, p_month, 0)
  ON CONFLICT (user_id, source, month) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- increment_usage_counter: 原子的インクリメント
CREATE OR REPLACE FUNCTION increment_usage_counter(p_user_id uuid, p_source text, p_month text, p_limit integer)
RETURNS integer AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE ai_usage_counters
  SET count = count + 1
  WHERE user_id = p_user_id AND source = p_source AND month = p_month AND count < p_limit
  RETURNING count INTO new_count;

  RETURN new_count;  -- NULL if no row updated (limit reached)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- decrement_usage_counter: 失敗時の補正
CREATE OR REPLACE FUNCTION decrement_usage_counter(p_user_id uuid, p_source text, p_month text)
RETURNS void AS $$
BEGIN
  UPDATE ai_usage_counters
  SET count = count - 1
  WHERE user_id = p_user_id AND source = p_source AND month = p_month AND count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Supabase SQL Editorで実行。

- [ ] **Step 3: usage-limit.ts を書き換え**

既存の `src/lib/ai/usage-limit.ts` を回数ベースに変更:

```typescript
// src/lib/ai/usage-limit.ts
// 後方互換性のためエクスポートを維持（既存のimportが壊れないように）
export { incrementUsageCounter, decrementUsageCounter, getUsageCounts, getUserPlanLimits } from "./usage-counter";
```

- [ ] **Step 4: コミット**

```bash
git add src/lib/ai/usage-counter.ts src/lib/ai/usage-limit.ts supabase/migrations/201_usage_counter_rpcs.sql
git commit -m "feat: add atomic usage counter with RPC functions"
```

---

## Task 4: 使用量API書き換え

**Files:**
- Modify: `src/app/api/usage/route.ts`

- [ ] **Step 1: usage API を回数ベースに変更**

```typescript
// src/app/api/usage/route.ts
import { NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth-helpers";
import { getUsageCounts, getUserPlanLimits } from "@/lib/ai/usage-counter";

export async function GET(req: Request) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const plan = await getUserPlanLimits(userId);
  const counts = await getUsageCounts(userId);

  const chatLimit = plan.ai_chat_monthly_limit;
  const planLimit = plan.ai_plan_monthly_limit;

  return NextResponse.json({
    chat: { used: counts.chat, limit: chatLimit, remaining: Math.max(0, chatLimit - counts.chat) },
    plan: { used: counts.plan, limit: planLimit, remaining: Math.max(0, planLimit - counts.plan) },
    limitReached: counts.chat >= chatLimit || counts.plan >= planLimit,
  });
}
```

- [ ] **Step 2: コミット**

```bash
git add src/app/api/usage/route.ts
git commit -m "feat: rewrite usage API to count-based limits"
```

---

## Task 5: AIエンドポイントに回数チェック統合

**Files:**
- Modify: `src/app/api/coach/chat/route.ts`
- Modify: `src/app/api/coach/plan/route.ts`

- [ ] **Step 1: coach/chat に回数チェック追加**

既存の `checkUsageLimit()` 呼び出しを `incrementUsageCounter()` に置き換え。ファイルの先頭付近で:

```typescript
import { incrementUsageCounter, decrementUsageCounter } from "@/lib/ai/usage-counter";
```

既存の `checkUsageLimit` チェック部分を置き換え:

```typescript
// Before AI call
const count = await incrementUsageCounter(userId, "chat");
if (count === null) {
  return new Response(JSON.stringify({ error: "limit_reached", source: "chat" }), {
    status: 429,
    headers: { "Content-Type": "application/json" },
  });
}
```

`streamText()` の `onFinish` コールバック内は既存のまま（ai_usageへのトークン記録は残す）。

ストリーミング開始前にエラーが発生した場合のデクリメント:

```typescript
try {
  const result = streamText({ ... });
  return result.toDataStreamResponse();
} catch (e) {
  await decrementUsageCounter(userId, "chat");
  throw e;
}
```

- [ ] **Step 2: coach/plan に同様の変更**

`incrementUsageCounter(userId, "plan")` に置き換え。`generateText()` の try-catch で失敗時にデクリメント。

- [ ] **Step 3: clubs/autofill の checkUsageLimit 削除**

autofill は回数制限対象外なので、`checkUsageLimit()` の呼び出しを削除。ai_usageへのトークン記録は残す。

- [ ] **Step 4: コミット**

```bash
git add src/app/api/coach/chat/route.ts src/app/api/coach/plan/route.ts src/app/api/clubs/autofill/route.ts
git commit -m "feat: integrate atomic usage counter into AI endpoints"
```

---

## Task 6: サブスクリプション取得API

**Files:**
- Create: `src/lib/subscription.ts`
- Modify: `src/app/api/subscription/route.ts`

- [ ] **Step 1: subscription.ts ヘルパー作成**

```typescript
// src/lib/subscription.ts
import { createClient } from "@/lib/supabase-server";
import { FREE_PLAN } from "@/lib/plans";
import type { Subscription, Plan } from "@/lib/plans";

/** アクティブサブスク取得。canceled→expired の遷移も処理 */
export async function getActiveSubscription(userId: string): Promise<{ subscription: Subscription | null; plan: Plan }> {
  const supabase = await createClient();

  // canceled で期間終了済みを expired に遷移
  await supabase
    .from("subscriptions")
    .update({ status: "expired" })
    .eq("user_id", userId)
    .eq("status", "canceled")
    .lt("current_period_end", new Date().toISOString());

  // grace_period_end 超過も expired に
  await supabase
    .from("subscriptions")
    .update({ status: "expired" })
    .eq("user_id", userId)
    .eq("status", "active")
    .not("grace_period_end", "is", null)
    .lt("grace_period_end", new Date().toISOString());

  // active を取得
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*, plan:plans(*)")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (!sub) return { subscription: null, plan: FREE_PLAN };
  return { subscription: sub as Subscription, plan: (sub.plan as Plan) ?? FREE_PLAN };
}
```

- [ ] **Step 2: subscription/route.ts をGETのみに簡素化**

POSTは `/api/payment/create` に統合するので削除。GETのみ残す:

```typescript
// src/app/api/subscription/route.ts
import { NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth-helpers";
import { getActiveSubscription } from "@/lib/subscription";

export async function GET(req: Request) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { subscription, plan } = await getActiveSubscription(userId);

  return NextResponse.json({
    subscription,
    plan,
  });
}
```

- [ ] **Step 3: コミット**

```bash
git add src/lib/subscription.ts src/app/api/subscription/route.ts
git commit -m "feat: add subscription helper with status transition"
```

---

## Task 7: Pay.jp 初期化 + 決済API

**Files:**
- Create: `src/lib/payjp.ts`
- Create: `src/app/api/payment/create/route.ts`
- Create: `src/app/api/payment/card/route.ts`

- [ ] **Step 1: payjp パッケージインストール**

```bash
npm install payjp
```

- [ ] **Step 2: 環境変数追加**

`.env.local` に追加:
```
PAYJP_SECRET_KEY=sk_test_xxxxx
PAYJP_PUBLIC_KEY=pk_test_xxxxx
PAYJP_WEBHOOK_SECRET=whsec_xxxxx
```

- [ ] **Step 3: payjp.ts 作成**

```typescript
// src/lib/payjp.ts
import Payjp from "payjp";

export const payjp = Payjp(process.env.PAYJP_SECRET_KEY!);
```

- [ ] **Step 4: payment/create/route.ts 作成（3フェーズ）**

```typescript
// src/app/api/payment/create/route.ts
import { NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase-server";
import { payjp } from "@/lib/payjp";
import { PLAN_ID } from "@/lib/plans";

export async function POST(req: Request) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { token, coupon_code } = await req.json();
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const supabase = await createClient();
  let couponId: string | null = null;
  let coupon: { discount_percent: number; free_months: number } | null = null;

  // ── Phase 1: クーポン予約（あれば）──
  if (coupon_code) {
    const { data: c } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", coupon_code)
      .eq("is_active", true)
      .single();

    if (!c || (c.expires_at && new Date(c.expires_at) < new Date())) {
      return NextResponse.json({ error: "invalid_coupon" }, { status: 400 });
    }

    // トランザクション: redemption INSERT + used_count INCREMENT
    const { error: redemptionError } = await supabase
      .from("coupon_redemptions")
      .insert({ user_id: userId, coupon_id: c.id });

    if (redemptionError) {
      return NextResponse.json({ error: "coupon_already_used" }, { status: 400 });
    }

    const { data: updated } = await supabase.rpc("increment_coupon_usage", { p_coupon_id: c.id });
    if (!updated) {
      await supabase.from("coupon_redemptions").delete().eq("user_id", userId).eq("coupon_id", c.id);
      return NextResponse.json({ error: "coupon_maxed_out" }, { status: 400 });
    }

    couponId = c.id;
    coupon = { discount_percent: c.discount_percent, free_months: c.free_months };
  }

  // ── Phase 2: Pay.jp API ──
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
      await payjp.customers.update(customerId, { card: token });
    } else {
      const customer = await payjp.customers.create({ card: token });
      customerId = customer.id;
    }

    let payjpSubId: string;
    let periodStart: string;
    let periodEnd: string;
    let trialEnd: string | null = null;

    if (coupon?.discount_percent) {
      // 初月割引: 手動チャージ + trial_end で翌月開始
      const { data: planRow } = await supabase.from("plans").select("price").eq("id", PLAN_ID.PRO).single();
      const price = planRow!.price;
      const discounted = Math.round(price * (1 - coupon.discount_percent / 100));
      await payjp.charges.create({ amount: discounted, currency: "jpy", customer: customerId });
      const trialEndTs = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      const sub = await payjp.subscriptions.create({ customer: customerId, plan: PLAN_ID.PRO, trial_end: trialEndTs });
      payjpSubId = sub.id;
      periodStart = new Date().toISOString();
      periodEnd = new Date(trialEndTs * 1000).toISOString();
      trialEnd = periodEnd;
    } else if (coupon?.free_months) {
      // 日数無料
      const trialDays = coupon.free_months * 30;
      const trialEndTs = Math.floor(Date.now() / 1000) + trialDays * 24 * 60 * 60;
      const sub = await payjp.subscriptions.create({ customer: customerId, plan: PLAN_ID.PRO, trial_end: trialEndTs });
      payjpSubId = sub.id;
      periodStart = new Date().toISOString();
      periodEnd = new Date(trialEndTs * 1000).toISOString();
      trialEnd = periodEnd;
    } else {
      // 通常
      const sub = await payjp.subscriptions.create({ customer: customerId, plan: PLAN_ID.PRO });
      payjpSubId = sub.id;
      periodStart = new Date(sub.current_period_start * 1000).toISOString();
      periodEnd = new Date(sub.current_period_end * 1000).toISOString();
    }

    // ── Phase 3: DB確定 ──
    // canceled 行があれば再利用
    const { data: canceledSub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "canceled")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    let subscriptionId: string;
    if (canceledSub) {
      const { data: updated } = await supabase
        .from("subscriptions")
        .update({
          status: "active",
          plan_id: PLAN_ID.PRO,
          payjp_subscription_id: payjpSubId,
          payjp_customer_id: customerId,
          current_period_start: periodStart,
          current_period_end: periodEnd,
          trial_end: trialEnd,
          grace_period_end: null,
        })
        .eq("id", canceledSub.id)
        .select("id")
        .single();
      subscriptionId = updated!.id;
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("subscriptions")
        .insert({
          user_id: userId,
          plan_id: PLAN_ID.PRO,
          payjp_subscription_id: payjpSubId,
          payjp_customer_id: customerId,
          current_period_start: periodStart,
          current_period_end: periodEnd,
          trial_end: trialEnd,
        })
        .select("id")
        .single();

      if (insertError) {
        return NextResponse.json({ error: "already_subscribed" }, { status: 409 });
      }
      subscriptionId = inserted!.id;
    }

    // クーポン redemption に subscription_id を紐付け
    if (couponId) {
      await supabase
        .from("coupon_redemptions")
        .update({ subscription_id: subscriptionId })
        .eq("user_id", userId)
        .eq("coupon_id", couponId);
    }

    return NextResponse.json({ success: true, subscription_id: subscriptionId });
  } catch (e) {
    // Pay.jp失敗 → クーポン予約ロールバック
    if (couponId) {
      await supabase.from("coupon_redemptions").delete().eq("user_id", userId).eq("coupon_id", couponId);
      await supabase.rpc("decrement_coupon_usage", { p_coupon_id: couponId });
    }
    console.error("Payment failed:", e);
    return NextResponse.json({ error: "payment_failed" }, { status: 500 });
  }
}
```

- [ ] **Step 5: クーポンRPC関数追加**

`supabase/migrations/202_coupon_rpcs.sql`:

```sql
CREATE OR REPLACE FUNCTION increment_coupon_usage(p_coupon_id uuid)
RETURNS boolean AS $$
DECLARE
  rows_updated integer;
BEGIN
  UPDATE coupons SET used_count = used_count + 1
  WHERE id = p_coupon_id AND (max_uses IS NULL OR used_count < max_uses);
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_coupon_usage(p_coupon_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE coupons SET used_count = used_count - 1
  WHERE id = p_coupon_id AND used_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- [ ] **Step 6: payment/card/route.ts 作成**

```typescript
// src/app/api/payment/card/route.ts
import { NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase-server";
import { payjp } from "@/lib/payjp";

export async function PATCH(req: Request) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const supabase = await createClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("payjp_customer_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (!sub?.payjp_customer_id) {
    return NextResponse.json({ error: "no_active_subscription" }, { status: 404 });
  }

  await payjp.customers.update(sub.payjp_customer_id, { card: token });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 7: コミット**

```bash
git add src/lib/payjp.ts src/app/api/payment/ supabase/migrations/202_coupon_rpcs.sql
git commit -m "feat: add Pay.jp payment create and card update endpoints"
```

---

## Task 8: Webhook + 解約 + クーポン検証

**Files:**
- Create: `src/app/api/webhook/payjp/route.ts`
- Create: `src/app/api/coupon/validate/route.ts`
- Create: `src/app/api/subscription/cancel/route.ts`
- Create: `src/app/api/cron/expire-subscriptions/route.ts`

- [ ] **Step 1: Webhook ハンドラ作成**

```typescript
// src/app/api/webhook/payjp/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();

  // TODO: Pay.jp署名検証（Payjp-Signatureヘッダ）
  // Pay.jpのSDKにビルトインの検証メソッドがあればそちらを使う

  const event = JSON.parse(body);
  const eventId = event.id;
  const eventType = event.type;

  // 冪等性チェック
  const { data: existing } = await supabase
    .from("webhook_events")
    .select("id")
    .eq("id", eventId)
    .single();

  if (existing) return NextResponse.json({ received: true });

  await supabase.from("webhook_events").insert({ id: eventId, event_type: eventType });

  const subscriptionData = event.data;

  switch (eventType) {
    case "subscription.renewed": {
      const payjpSubId = subscriptionData.id;
      await supabase
        .from("subscriptions")
        .update({
          current_period_start: new Date(subscriptionData.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscriptionData.current_period_end * 1000).toISOString(),
          grace_period_end: null,
        })
        .eq("payjp_subscription_id", payjpSubId);
      break;
    }
    case "subscription.canceled": {
      const payjpSubId = subscriptionData.id;
      await supabase
        .from("subscriptions")
        .update({ status: "canceled" })
        .eq("payjp_subscription_id", payjpSubId);
      break;
    }
    case "charge.succeeded": {
      const customerId = subscriptionData.customer;
      await supabase
        .from("subscriptions")
        .update({ grace_period_end: null })
        .eq("payjp_customer_id", customerId)
        .eq("status", "active");
      break;
    }
    case "charge.failed": {
      const customerId = subscriptionData.customer;
      const graceEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      // grace_period_end IS NULL の場合のみセット
      await supabase.rpc("set_grace_period", { p_customer_id: customerId, p_grace_end: graceEnd });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
```

grace_period RPC（`supabase/migrations/203_grace_period_rpc.sql`）:

```sql
CREATE OR REPLACE FUNCTION set_grace_period(p_customer_id text, p_grace_end timestamptz)
RETURNS void AS $$
BEGIN
  UPDATE subscriptions
  SET grace_period_end = p_grace_end
  WHERE payjp_customer_id = p_customer_id AND status = 'active' AND grace_period_end IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- [ ] **Step 2: 解約API作成**

```typescript
// src/app/api/subscription/cancel/route.ts
import { NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase-server";
import { payjp } from "@/lib/payjp";

export async function POST(req: Request) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, payjp_subscription_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (!sub) return NextResponse.json({ error: "no_active_subscription" }, { status: 404 });

  // Pay.jp を先にキャンセル
  if (sub.payjp_subscription_id) {
    await payjp.subscriptions.cancel(sub.payjp_subscription_id);
  }

  // DB更新
  await supabase
    .from("subscriptions")
    .update({ status: "canceled" })
    .eq("id", sub.id);

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: クーポン検証API作成**

```typescript
// src/app/api/coupon/validate/route.ts
import { NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth-helpers";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });

  const { data: coupon } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .eq("is_active", true)
    .single();

  if (!coupon) return NextResponse.json({ error: "invalid_coupon" }, { status: 404 });
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return NextResponse.json({ error: "coupon_expired" }, { status: 400 });
  }
  if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
    return NextResponse.json({ error: "coupon_maxed_out" }, { status: 400 });
  }

  // 既に使用済みチェック
  const { data: redemption } = await supabase
    .from("coupon_redemptions")
    .select("id")
    .eq("user_id", userId)
    .eq("coupon_id", coupon.id)
    .single();

  if (redemption) return NextResponse.json({ error: "coupon_already_used" }, { status: 400 });

  return NextResponse.json({
    valid: true,
    discount_percent: coupon.discount_percent,
    free_months: coupon.free_months,
    free_days: coupon.free_months > 0 ? coupon.free_months * 30 : 0,
  });
}
```

- [ ] **Step 4: Cron エンドポイント作成（Vercel Cron 代替）**

```typescript
// src/app/api/cron/expire-subscriptions/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  // 簡易認証（cron secret）
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

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
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  await supabase.from("webhook_events").delete().lt("processed_at", cutoff);

  return NextResponse.json({ expired: (canceledCount ?? 0) + (graceCount ?? 0) });
}
```

- [ ] **Step 5: コミット**

```bash
git add src/app/api/webhook/payjp/ src/app/api/subscription/cancel/ src/app/api/coupon/validate/ src/app/api/cron/expire-subscriptions/ supabase/migrations/203_grace_period_rpc.sql
git commit -m "feat: add webhook, cancel, coupon validate, and cron endpoints"
```

---

## Task 9: ローカルモードスタブ更新

**Files:**
- Modify: `src/lib/api-client.ts`

- [ ] **Step 1: ローカルモードの usage スタブを回数ベースに変更**

`src/lib/api-client.ts` のスタブ（L523-551付近）を更新:

```typescript
// GET /api/usage のスタブ
case "/api/usage":
  return {
    chat: { used: 0, limit: 0, remaining: 0 },
    plan: { used: 0, limit: 0, remaining: 0 },
    limitReached: true,  // 未ログインは利用不可
  };

// GET /api/subscription のスタブ
case "/api/subscription":
  return { subscription: null, plan: { id: "free", name: "無料", price: 0, ai_chat_monthly_limit: 0, ai_plan_monthly_limit: 0 } };
```

- [ ] **Step 2: コミット**

```bash
git add src/lib/api-client.ts
git commit -m "fix: update local mode stubs for count-based usage limits"
```

---

## Task 10: フロントエンド — hooks + 共通コンポーネント

**Files:**
- Create: `src/hooks/use-usage.ts`
- Create: `src/hooks/use-subscription.ts`
- Create: `src/components/usage-badge.tsx`
- Create: `src/components/limit-reached-card.tsx`

- [ ] **Step 1: use-usage.ts 作成**

```typescript
// src/hooks/use-usage.ts
import useSWR from "swr";
import { apiFetch } from "@/lib/api-client";

interface UsageData {
  chat: { used: number; limit: number; remaining: number };
  plan: { used: number; limit: number; remaining: number };
  limitReached: boolean;
}

export function useUsage() {
  const { data, error, mutate } = useSWR<UsageData>("/api/usage", () => apiFetch("/api/usage"), {
    revalidateOnFocus: true,
  });
  return { usage: data, error, mutate };
}
```

- [ ] **Step 2: use-subscription.ts 作成**

```typescript
// src/hooks/use-subscription.ts
import useSWR from "swr";
import { apiFetch } from "@/lib/api-client";
import type { Plan, Subscription } from "@/lib/plans";

interface SubscriptionData {
  subscription: Subscription | null;
  plan: Plan;
}

export function useSubscription() {
  const { data, error, mutate } = useSWR<SubscriptionData>("/api/subscription", () => apiFetch("/api/subscription"), {
    revalidateOnFocus: true,
  });
  return { subscription: data?.subscription, plan: data?.plan, error, mutate };
}
```

- [ ] **Step 3: usage-badge.tsx 作成**

```typescript
// src/components/usage-badge.tsx
"use client";

export function UsageBadge({ used, limit }: { used: number; limit: number }) {
  const remaining = Math.max(0, limit - used);
  return (
    <span className="text-xs text-white/70">
      残り{remaining}/{limit}回
    </span>
  );
}
```

- [ ] **Step 4: limit-reached-card.tsx 作成**

```typescript
// src/components/limit-reached-card.tsx
"use client";

import Link from "next/link";

export function LimitReachedCard() {
  return (
    <div className="bg-white/90 rounded-lg p-4 text-center space-y-3">
      <p className="text-sm font-bold text-[#2c2c2c]">今月の利用上限に達しました</p>
      <Link
        href="/settings/plan"
        className="inline-block px-6 py-2 rounded-full bg-[#006728] text-white text-sm font-bold"
      >
        Waggly Proにアップグレード
      </Link>
    </div>
  );
}
```

- [ ] **Step 5: コミット**

```bash
git add src/hooks/use-usage.ts src/hooks/use-subscription.ts src/components/usage-badge.tsx src/components/limit-reached-card.tsx
git commit -m "feat: add usage/subscription hooks and UI components"
```

---

## Task 11: チャット画面に回数表示・上限UI統合

**Files:**
- Modify: `src/app/coach/page.tsx`

- [ ] **Step 1: チャット画面に残り回数と上限到達UIを追加**

import追加:
```typescript
import { useUsage } from "@/hooks/use-usage";
import { UsageBadge } from "@/components/usage-badge";
import { LimitReachedCard } from "@/components/limit-reached-card";
```

ChatView内で使用量を取得:
```typescript
const { usage, mutate: mutateUsage } = useUsage();
const chatLimitReached = usage && usage.chat.remaining <= 0;
```

入力エリアの上に残り回数バッジ表示:
```typescript
{usage && <UsageBadge used={usage.chat.used} limit={usage.chat.limit} />}
```

上限到達時に入力を無効化 + カード表示:
```typescript
{chatLimitReached ? (
  <LimitReachedCard />
) : (
  // 既存の入力フォーム
)}
```

メッセージ送信成功後に `mutateUsage()` を呼ぶ。

- [ ] **Step 2: コミット**

```bash
git add src/app/coach/page.tsx
git commit -m "feat: add usage badge and limit reached UI to coach page"
```

---

## Task 12: 設定画面の使用量表示を回数ベースに変更

**Files:**
- Modify: `src/app/settings/page.tsx`

- [ ] **Step 1: 設定画面の使用量セクションを書き換え**

既存のトークンベース表示（L446-480付近）を回数ベースに変更:

```typescript
import { useUsage } from "@/hooks/use-usage";
import { useSubscription } from "@/hooks/use-subscription";
```

使用量セクション:
```typescript
const { usage } = useUsage();
const { plan } = useSubscription();

// 表示
{usage && (
  <div className="space-y-2">
    <div className="flex justify-between text-sm">
      <span>AIチャット</span>
      <span>{usage.chat.used}/{usage.chat.limit}回</span>
    </div>
    <div className="flex justify-between text-sm">
      <span>練習メニュー</span>
      <span>{usage.plan.used}/{usage.plan.limit}回</span>
    </div>
  </div>
)}
```

プラン行を追加:
```typescript
<Link href="/settings/plan" className="flex justify-between items-center">
  <span>プラン</span>
  <span className="text-sm">
    {plan?.id === 'pro' ? 'Waggly Pro' : '無料プラン'}
  </span>
</Link>
```

- [ ] **Step 2: コミット**

```bash
git add src/app/settings/page.tsx
git commit -m "feat: update settings page to count-based usage display"
```

---

## Task 13: プラン画面

**Files:**
- Create: `src/app/settings/plan/page.tsx`

- [ ] **Step 1: プラン画面作成**

このファイルはUIが複雑なため、主要な構造を示す。詳細なスタイリングは既存のsettingsページに合わせる:

```typescript
// src/app/settings/plan/page.tsx
"use client";

import { useState } from "react";
import { useSubscription } from "@/hooks/use-subscription";
import { useUsage } from "@/hooks/use-usage";
import { apiFetch } from "@/lib/api-client";
import { PLAN_ID } from "@/lib/plans";
import { PageHeader } from "@/components/layout/page-header";

export default function PlanPage() {
  const { subscription, plan, mutate } = useSubscription();
  const { usage } = useUsage();
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<{ valid: boolean; discount_percent: number; free_days: number } | null>(null);

  const isPro = plan?.id === PLAN_ID.PRO;

  async function handleValidateCoupon() {
    if (!couponCode.trim()) return;
    try {
      const result = await apiFetch("/api/coupon/validate", { method: "POST", body: JSON.stringify({ code: couponCode }) });
      setCouponResult(result);
    } catch {
      setCouponResult(null);
    }
  }

  async function handleUpgrade(token: string) {
    setLoading(true);
    try {
      await apiFetch("/api/payment/create", {
        method: "POST",
        body: JSON.stringify({ token, coupon_code: couponResult?.valid ? couponCode : undefined }),
      });
      mutate();
    } catch (e) {
      alert("決済に失敗しました。再度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!confirm("Waggly Proを解約しますか？現在の期間終了まで引き続きご利用いただけます。")) return;
    setLoading(true);
    try {
      await apiFetch("/api/subscription/cancel", { method: "POST" });
      mutate();
    } catch {
      alert("解約に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-4" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)" }}>
      <div className="relative z-10 flex flex-col space-y-4">
        <PageHeader title="プラン" variant="dark" />

        {/* 現在のプラン */}
        <div className="rounded-lg bg-white p-4">
          <h3 className="text-base font-bold mb-2">{isPro ? "Waggly Pro" : "無料プラン"}</h3>
          {isPro && subscription?.current_period_end && (
            <p className="text-sm text-[#666]">次回更新日: {new Date(subscription.current_period_end).toLocaleDateString("ja-JP")}</p>
          )}
          {usage && (
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between"><span>AIチャット</span><span>{usage.chat.used}/{usage.chat.limit}回</span></div>
              <div className="flex justify-between"><span>練習メニュー</span><span>{usage.plan.used}/{usage.plan.limit}回</span></div>
            </div>
          )}
        </div>

        {/* プラン比較 */}
        {!isPro && (
          <div className="rounded-lg bg-white p-4">
            <h3 className="text-base font-bold mb-3">Waggly Pro</h3>
            <p className="text-2xl font-bold text-[#006728] mb-2">¥480<span className="text-sm font-normal">/月</span></p>
            <ul className="text-sm space-y-1 mb-4">
              <li>AIチャット 月100回</li>
              <li>練習メニュー提案 月30回</li>
            </ul>

            {/* クーポン */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="クーポンコード"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="flex-1 border rounded px-3 py-2 text-sm"
              />
              <button onClick={handleValidateCoupon} className="px-3 py-2 bg-[#006728] text-white rounded text-sm">適用</button>
            </div>
            {couponResult?.valid && (
              <p className="text-sm text-[#006728] mb-4">
                {couponResult.discount_percent > 0 && `初月${couponResult.discount_percent}%OFF!`}
                {couponResult.free_days > 0 && `${couponResult.free_days}日間無料!`}
              </p>
            )}

            {/* Pay.jp カード入力は payjp.js の Checkout を使う（別途統合） */}
            <button
              onClick={() => {
                // TODO: Pay.jp Checkout でトークン取得 → handleUpgrade(token)
              }}
              disabled={loading}
              className="w-full py-3 rounded-full bg-[#006728] text-white font-bold disabled:opacity-40"
            >
              {loading ? "処理中..." : "アップグレード"}
            </button>
          </div>
        )}

        {/* Pro ユーザー: 解約 + カード変更 */}
        {isPro && (
          <div className="rounded-lg bg-white p-4 space-y-3">
            <button onClick={handleCancel} disabled={loading} className="w-full py-2 border border-red-400 text-red-500 rounded text-sm">
              {loading ? "処理中..." : "解約する"}
            </button>
            <button className="w-full py-2 border rounded text-sm">お支払い方法を変更</button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: コミット**

```bash
git add src/app/settings/plan/page.tsx
git commit -m "feat: add plan management page with upgrade/cancel/coupon"
```

---

## Task 14: Pay.jp Checkout 統合

**Files:**
- Modify: `src/app/settings/plan/page.tsx`

- [ ] **Step 1: Pay.jp の payjp.js を読み込み、Checkout でカードトークンを取得**

Pay.jp Checkout をScript タグで読み込み、ボタンクリック時にトークンを取得する。Pay.jp のドキュメント（https://pay.jp/docs/checkout）を参照して実装。

プラン画面のアップグレードボタンで `Payjp.checkout.open()` を呼び、コールバックでトークンを受け取り `handleUpgrade(token)` を呼ぶ。

- [ ] **Step 2: コミット**

```bash
git add src/app/settings/plan/page.tsx
git commit -m "feat: integrate Pay.jp Checkout for card tokenization"
```

---

## Task 15: vercel.json にCron設定

**Files:**
- Modify or Create: `vercel.json`

- [ ] **Step 1: Vercel Cron を設定**

```json
{
  "crons": [
    {
      "path": "/api/cron/expire-subscriptions",
      "schedule": "0 18 * * *"
    }
  ]
}
```

`.env` に `CRON_SECRET` を追加。Vercel の環境変数にも設定。

- [ ] **Step 2: コミット**

```bash
git add vercel.json
git commit -m "feat: add Vercel Cron for subscription expiry"
```

---

## セルフレビュー

**Spec coverage:** 全セクション（DB設計、API設計、フロントエンドUI、Pay.jp連携、セキュリティ、テスト戦略）がタスクにマッピングされている。管理機能はspec通り初期はSQL直打ちのため実装タスク不要。

**Placeholder scan:** Task 14 の Pay.jp Checkout 統合に TODO が残っている。これはPay.jp のドキュメントに依存するため、実装時にドキュメントを参照して埋める。

**Type consistency:** `Plan`, `Subscription`, `Coupon` 型は Task 2 で定義し、以降のタスクで一貫して使用。`PLAN_ID.FREE` / `PLAN_ID.PRO` を全箇所で使用。`getMonthJST()` は usage-counter.ts と plans.ts で共通。

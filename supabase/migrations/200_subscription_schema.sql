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

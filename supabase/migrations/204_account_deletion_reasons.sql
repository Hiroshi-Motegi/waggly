-- 解約理由テーブル（users 削除後も理由を残すため FK なし）
CREATE TABLE IF NOT EXISTS public.account_deletion_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  reason text NOT NULL,
  plan_id text NOT NULL DEFAULT 'free',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- subscriptions の status CHECK に paused を追加
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
    CHECK (status IN ('active', 'canceled', 'expired', 'paused'));

-- 240_line_notification_logs.sql
CREATE TABLE public.line_notification_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,  -- 'add_club' | 'share_card'
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, notification_type)
);

-- RLS: サービスロール（admin client）のみアクセス。一般ユーザーは不要。
ALTER TABLE public.line_notification_logs ENABLE ROW LEVEL SECURITY;
-- （ポリシーなし = admin clientのみ読み書き可）

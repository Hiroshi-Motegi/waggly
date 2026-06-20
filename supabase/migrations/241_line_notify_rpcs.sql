-- ============================================================
-- 241: LINE通知用クエリRPCとnotification_typeチェック制約
-- ============================================================

-- notification_typeチェック制約（240マイグレーション適用後に追加）
ALTER TABLE public.line_notification_logs
  ADD CONSTRAINT line_notification_logs_type_check
  CHECK (notification_type IN ('add_club', 'share_card'));

-- 通知① add_club: 登録3日超 & クラブ0件 & 未送信 の LINE ユーザー
CREATE OR REPLACE FUNCTION public.get_line_notify_add_club()
RETURNS TABLE(line_user_id text, user_id uuid)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT up.provider_sub AS line_user_id, u.id AS user_id
  FROM users u
  JOIN user_providers up ON up.user_id = u.id AND up.provider = 'line'
  LEFT JOIN clubs c ON c.user_id = u.id
  LEFT JOIN line_notification_logs l
    ON l.user_id = u.id AND l.notification_type = 'add_club'
  WHERE c.id IS NULL
    AND u.created_at < now() - interval '3 days'
    AND l.id IS NULL;
$$;

-- 通知② share_card: 初回クラブ登録3日超 & username未設定 & 未送信 の LINE ユーザー
CREATE OR REPLACE FUNCTION public.get_line_notify_share_card()
RETURNS TABLE(line_user_id text, user_id uuid)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT up.provider_sub AS line_user_id, u.id AS user_id
  FROM users u
  JOIN user_providers up ON up.user_id = u.id AND up.provider = 'line'
  JOIN clubs c ON c.user_id = u.id
  LEFT JOIN profiles p ON p.id = u.id
  LEFT JOIN line_notification_logs l
    ON l.user_id = u.id AND l.notification_type = 'share_card'
  WHERE (p.username IS NULL)
    AND l.id IS NULL
  GROUP BY up.provider_sub, u.id
  HAVING MIN(c.created_at) < now() - interval '3 days';
$$;

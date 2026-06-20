-- ============================================================
-- 242: get_line_notify_add_club RPC に GROUP BY を追加
-- ============================================================

-- user_providers に LINE プロバイダー行が複数存在するエッジケース対策
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
    AND l.id IS NULL
  GROUP BY up.provider_sub, u.id;
$$;

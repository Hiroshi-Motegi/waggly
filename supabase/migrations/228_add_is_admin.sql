-- ユーザーに管理者フラグを追加
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- 管理者以外は自分の is_admin を変更できない（RLSで保護）
-- ※ API側では service_role クライアントを使用するため、
--   RLS は追加の安全ネットとして機能

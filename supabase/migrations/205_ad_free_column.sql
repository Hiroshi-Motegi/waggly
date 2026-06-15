-- 既に手動で追加済み（記録用）
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ad_free boolean NOT NULL DEFAULT false;

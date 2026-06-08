-- Add bag_number column to clubs (1 = マイバッグ, 2 = 予備バッグ)
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS bag_number integer NOT NULL DEFAULT 1;

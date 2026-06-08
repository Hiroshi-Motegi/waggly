-- 詳細スペック: プログレッシブディスクロージャー（詳細層）
-- 基本層（既存）: category, club_number, maker, model, shaft_name, shaft_flex, loft, lie, length, distance
-- 詳細層（新規）: weight, swing_weight, frequency, kick_point, head_volume, head_weight

ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS weight numeric;          -- 総重量 (g)
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS swing_weight text;       -- バランス (D0, D1, D2 等)
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS frequency integer;       -- 振動数 (cpm)
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS kick_point text;         -- キックポイント (先調子/中調子/元調子)
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS head_volume integer;     -- ヘッド体積 (cc)
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS head_weight numeric;     -- ヘッド重量 (g)

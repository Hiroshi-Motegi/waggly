-- 構造化メモ: タグベースのクラブ別フィードバック
-- condition: 調子（good/normal/bad）
-- symptom_tags: 症状タグ（JSON配列）
-- feeling_tags: 体の感覚タグ（JSON配列）
-- gear_tags: ギアの気づきタグ（JSON配列）

ALTER TABLE public.club_memos ADD COLUMN IF NOT EXISTS condition text CHECK (condition IN ('good', 'normal', 'bad'));
ALTER TABLE public.club_memos ADD COLUMN IF NOT EXISTS symptom_tags jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.club_memos ADD COLUMN IF NOT EXISTS feeling_tags jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.club_memos ADD COLUMN IF NOT EXISTS gear_tags jsonb DEFAULT '[]'::jsonb;

-- practice_sessions に rating カラム追加（既存UIで収集しているが未保存）
ALTER TABLE public.practice_sessions ADD COLUMN IF NOT EXISTS rating integer CHECK (rating BETWEEN 1 AND 5);

-- シリーズにカテゴリを追加（ドライバー/FW/UT/アイアン/ウェッジ/パター）
ALTER TABLE club_spec_series ADD COLUMN category text;

-- 既存シリーズのカテゴリを紐づくheadsから推定して埋める
UPDATE club_spec_series s
SET category = (
  SELECT h.category
  FROM club_spec_heads h
  WHERE h.series_id = s.id
  LIMIT 1
)
WHERE s.category IS NULL
  AND EXISTS (SELECT 1 FROM club_spec_heads h WHERE h.series_id = s.id);

-- ユニーク制約を maker+model+category に変更（同モデルでもカテゴリ違いは別シリーズ）
DROP INDEX IF EXISTS idx_club_spec_series_unique;
CREATE UNIQUE INDEX idx_club_spec_series_unique ON club_spec_series(maker, model, COALESCE(category, ''));

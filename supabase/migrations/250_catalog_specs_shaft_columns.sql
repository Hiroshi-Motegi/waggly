-- ============================================================
-- 250: catalog_specs にシャフト列を追加 & ユニーク制約を修正
-- TypeScript型には存在していたが、DBカラムが未作成だった
-- ============================================================

-- シャフト識別カラムを追加
ALTER TABLE catalog_specs ADD COLUMN IF NOT EXISTS shaft_name text;
ALTER TABLE catalog_specs ADD COLUMN IF NOT EXISTS shaft_flex text;

-- 旧ユニーク制約（model_id, club_number）だとシャフト別スペックが持てないので削除
DROP INDEX IF EXISTS idx_catalog_specs_model_club;

-- 新ユニーク制約: ヘッドスペック（shaft_name IS NULL）と
-- シャフト別スペック（shaft_name IS NOT NULL）が共存できるようにする
CREATE UNIQUE INDEX idx_catalog_specs_model_club
  ON catalog_specs(model_id, club_number, COALESCE(shaft_name, ''), COALESCE(shaft_flex, ''));

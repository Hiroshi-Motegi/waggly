-- club_models → sets リネーム
-- club_model_shafts → set_shafts, club_model_grips → set_grips

BEGIN;

-- テーブルリネーム
ALTER TABLE club_models RENAME TO sets;
ALTER TABLE club_model_shafts RENAME TO set_shafts;
ALTER TABLE club_model_grips RENAME TO set_grips;

-- heads: model_id → set_id
ALTER TABLE heads RENAME COLUMN model_id TO set_id;

-- sets 内カラム: product_line_id はそのまま

-- set_shafts: model_id → set_id
ALTER TABLE set_shafts RENAME COLUMN model_id TO set_id;

-- set_grips: model_id → set_id
ALTER TABLE set_grips RENAME COLUMN model_id TO set_id;

-- RLSポリシー再作成
DROP POLICY IF EXISTS "Deny all for non-service roles" ON sets;
CREATE POLICY "Deny all for non-service roles" ON sets FOR ALL USING (false);

DROP POLICY IF EXISTS "Deny all for non-service roles" ON set_shafts;
CREATE POLICY "Deny all for non-service roles" ON set_shafts FOR ALL USING (false);

DROP POLICY IF EXISTS "Deny all for non-service roles" ON set_grips;
CREATE POLICY "Deny all for non-service roles" ON set_grips FOR ALL USING (false);

-- ユニーク制約リネーム
DROP INDEX IF EXISTS idx_club_models_unique;
CREATE UNIQUE INDEX idx_sets_unique ON sets(product_line_id, COALESCE(name, ''), COALESCE(category, ''));

DROP INDEX IF EXISTS idx_club_model_shafts_unique;
CREATE UNIQUE INDEX idx_set_shafts_unique ON set_shafts(set_id, shaft_model_id);

DROP INDEX IF EXISTS idx_club_model_grips_unique;
CREATE UNIQUE INDEX idx_set_grips_unique ON set_grips(set_id, grip_model_id);

-- heads インデックスリネーム (model_id → set_id)
DROP INDEX IF EXISTS idx_heads_model_unique;
CREATE UNIQUE INDEX idx_heads_set_unique
  ON heads(set_id, category, COALESCE(club_number, ''))
  WHERE set_id IS NOT NULL;

DROP INDEX IF EXISTS idx_heads_model;
CREATE INDEX idx_heads_set ON heads(set_id) WHERE set_id IS NOT NULL;

COMMIT;

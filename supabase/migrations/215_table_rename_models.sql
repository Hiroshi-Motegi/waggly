-- ============================================================
-- テーブルリネーム & モデル/バリアント分離
-- shaft_models / grip_models 親テーブル作成、既存テーブルのリネーム
-- ============================================================

BEGIN;

-- ════════════════════════════════════════════════════════════
-- 1. shaft_models（シャフトモデル親テーブル）
-- ════════════════════════════════════════════════════════════

CREATE TABLE shaft_models (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  maker text NOT NULL,
  maker_normalized text NOT NULL,
  name text NOT NULL,
  name_normalized text NOT NULL,
  type text,                          -- steel / carbon
  image_url text,
  affiliate_url text,
  own_image_url text,
  source text NOT NULL DEFAULT 'ai',
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_shaft_models_unique ON shaft_models(maker_normalized, name_normalized);

ALTER TABLE shaft_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all for non-service roles" ON shaft_models FOR ALL USING (false);

CREATE TRIGGER shaft_models_updated_at
  BEFORE UPDATE ON shaft_models
  FOR EACH ROW EXECUTE FUNCTION update_club_specs_updated_at();

-- ════════════════════════════════════════════════════════════
-- 2. grip_models（グリップモデル親テーブル）
-- ════════════════════════════════════════════════════════════

CREATE TABLE grip_models (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  maker text NOT NULL,
  maker_normalized text NOT NULL,
  name text NOT NULL,
  name_normalized text NOT NULL,
  material text,                      -- ラバー, コード, エラストマー 等
  image_url text,
  affiliate_url text,
  own_image_url text,
  source text NOT NULL DEFAULT 'ai',
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_grip_models_unique ON grip_models(maker_normalized, name_normalized);

ALTER TABLE grip_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all for non-service roles" ON grip_models FOR ALL USING (false);

CREATE TRIGGER grip_models_updated_at
  BEFORE UPDATE ON grip_models
  FOR EACH ROW EXECUTE FUNCTION update_club_specs_updated_at();

-- ════════════════════════════════════════════════════════════
-- 3. shafts → shaft_models データ移行
-- ════════════════════════════════════════════════════════════

INSERT INTO shaft_models (maker, maker_normalized, name, name_normalized, type, image_url, affiliate_url, own_image_url, source, verified)
SELECT DISTINCT ON (maker_normalized, name_normalized)
  maker, maker_normalized, name, name_normalized, type, image_url, affiliate_url, own_image_url, source, verified
FROM shafts
ORDER BY maker_normalized, name_normalized, created_at;

-- ════════════════════════════════════════════════════════════
-- 4. grips → grip_models データ移行
-- ════════════════════════════════════════════════════════════

INSERT INTO grip_models (maker, maker_normalized, name, name_normalized, material, image_url, affiliate_url, own_image_url, source, verified)
SELECT DISTINCT ON (maker_normalized, name_normalized)
  maker, maker_normalized, name, name_normalized, material, image_url, affiliate_url, own_image_url, source, verified
FROM grips
ORDER BY maker_normalized, name_normalized, created_at;

-- ════════════════════════════════════════════════════════════
-- 5. shafts → shaft_variants（model_id追加、共有カラム削除）
-- ════════════════════════════════════════════════════════════

-- model_id カラム追加
ALTER TABLE shafts ADD COLUMN model_id uuid;

-- model_id を既存データからマッピング
UPDATE shafts s
SET model_id = sm.id
FROM shaft_models sm
WHERE s.maker_normalized = sm.maker_normalized
  AND s.name_normalized = sm.name_normalized;

-- model_id を NOT NULL に
ALTER TABLE shafts ALTER COLUMN model_id SET NOT NULL;

-- FK 追加
ALTER TABLE shafts ADD CONSTRAINT shafts_model_id_fkey
  FOREIGN KEY (model_id) REFERENCES shaft_models(id) ON DELETE CASCADE;

-- 共有カラム削除
ALTER TABLE shafts DROP COLUMN maker;
ALTER TABLE shafts DROP COLUMN maker_normalized;
ALTER TABLE shafts DROP COLUMN name;
ALTER TABLE shafts DROP COLUMN name_normalized;
ALTER TABLE shafts DROP COLUMN type;
ALTER TABLE shafts DROP COLUMN image_url;
ALTER TABLE shafts DROP COLUMN affiliate_url;
ALTER TABLE shafts DROP COLUMN own_image_url;

-- 旧ユニーク制約削除
DROP INDEX IF EXISTS idx_shafts_unique;

-- テーブルリネーム
ALTER TABLE shafts RENAME TO shaft_variants;

-- 新ユニーク制約（model_id + flex）
CREATE UNIQUE INDEX idx_shaft_variants_unique ON shaft_variants(model_id, COALESCE(flex, ''));

-- ════════════════════════════════════════════════════════════
-- 6. grips → grip_variants（model_id追加、共有カラム削除）
-- ════════════════════════════════════════════════════════════

-- model_id カラム追加
ALTER TABLE grips ADD COLUMN model_id uuid;

-- model_id を既存データからマッピング
UPDATE grips g
SET model_id = gm.id
FROM grip_models gm
WHERE g.maker_normalized = gm.maker_normalized
  AND g.name_normalized = gm.name_normalized;

-- model_id を NOT NULL に
ALTER TABLE grips ALTER COLUMN model_id SET NOT NULL;

-- FK 追加
ALTER TABLE grips ADD CONSTRAINT grips_model_id_fkey
  FOREIGN KEY (model_id) REFERENCES grip_models(id) ON DELETE CASCADE;

-- 共有カラム削除
ALTER TABLE grips DROP COLUMN maker;
ALTER TABLE grips DROP COLUMN maker_normalized;
ALTER TABLE grips DROP COLUMN name;
ALTER TABLE grips DROP COLUMN name_normalized;
ALTER TABLE grips DROP COLUMN material;
ALTER TABLE grips DROP COLUMN image_url;
ALTER TABLE grips DROP COLUMN affiliate_url;
ALTER TABLE grips DROP COLUMN own_image_url;

-- 旧ユニーク制約削除
DROP INDEX IF EXISTS idx_grips_unique;

-- テーブルリネーム
ALTER TABLE grips RENAME TO grip_variants;

-- 新ユニーク制約（model_id + size）
CREATE UNIQUE INDEX idx_grip_variants_unique ON grip_variants(model_id, COALESCE(size, ''));

-- ════════════════════════════════════════════════════════════
-- 7. club_spec_series → club_models
-- ════════════════════════════════════════════════════════════

ALTER TABLE club_spec_series RENAME TO club_models;

-- RLS: 旧ポリシー削除 → 新ポリシー作成
DROP POLICY IF EXISTS "Deny all for non-service roles" ON club_models;
CREATE POLICY "Deny all for non-service roles" ON club_models FOR ALL USING (false);

-- ユニーク制約: 旧削除 → 新作成
DROP INDEX IF EXISTS idx_club_spec_series_unique;
CREATE UNIQUE INDEX idx_club_models_unique ON club_models(maker, model, COALESCE(category, ''));

-- ════════════════════════════════════════════════════════════
-- 8. club_spec_heads → heads（series_id → model_id）
-- ════════════════════════════════════════════════════════════

ALTER TABLE club_spec_heads RENAME TO heads;

-- series_id → model_id リネーム
ALTER TABLE heads RENAME COLUMN series_id TO model_id;

-- RLS: 旧ポリシー削除 → 新ポリシー作成
DROP POLICY IF EXISTS "Deny all for non-service roles" ON heads;
CREATE POLICY "Deny all for non-service roles" ON heads FOR ALL USING (false);

-- インデックスリネーム（内容は変わらないが名前を合わせる）
DROP INDEX IF EXISTS idx_club_spec_heads_unique;
CREATE UNIQUE INDEX idx_heads_unique
  ON heads(maker_normalized, model_normalized, category, COALESCE(club_number, ''));

DROP INDEX IF EXISTS idx_club_spec_heads_lookup;
CREATE INDEX idx_heads_lookup
  ON heads(maker_normalized, model_normalized, category);

DROP INDEX IF EXISTS idx_club_spec_heads_series_unique;
CREATE UNIQUE INDEX idx_heads_model_unique
  ON heads(model_id, category, COALESCE(club_number, ''))
  WHERE model_id IS NOT NULL;

DROP INDEX IF EXISTS idx_club_spec_heads_series;
CREATE INDEX idx_heads_model
  ON heads(model_id) WHERE model_id IS NOT NULL;

-- upsert function: 旧削除 → 新作成（heads テーブル参照）
DROP FUNCTION IF EXISTS upsert_club_spec_head CASCADE;

CREATE OR REPLACE FUNCTION upsert_head(
  p_maker text,
  p_model text,
  p_category text,
  p_club_number text,
  p_maker_normalized text,
  p_model_normalized text,
  p_loft numeric,
  p_lie numeric,
  p_head_volume numeric,
  p_head_weight numeric,
  p_distance numeric,
  p_image_url text,
  p_affiliate_url text
) RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO heads (
    maker, model, category, club_number,
    maker_normalized, model_normalized,
    loft, lie, head_volume, head_weight, distance,
    image_url, affiliate_url, source, verified
  ) VALUES (
    p_maker, p_model, p_category, p_club_number,
    p_maker_normalized, p_model_normalized,
    p_loft, p_lie, p_head_volume, p_head_weight, p_distance,
    p_image_url, p_affiliate_url, 'ai', false
  )
  ON CONFLICT (maker_normalized, model_normalized, category, COALESCE(club_number, ''))
  DO UPDATE SET
    loft = EXCLUDED.loft,
    lie = EXCLUDED.lie,
    head_volume = EXCLUDED.head_volume,
    head_weight = EXCLUDED.head_weight,
    distance = EXCLUDED.distance,
    image_url = EXCLUDED.image_url,
    affiliate_url = EXCLUDED.affiliate_url
  WHERE heads.verified = false
  RETURNING id INTO v_id;

  -- ON CONFLICT DO NOTHING の場合（verified=true）は既存IDを取得
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM heads
    WHERE maker_normalized = p_maker_normalized
      AND model_normalized = p_model_normalized
      AND category = p_category
      AND COALESCE(club_number, '') = COALESCE(p_club_number, '');
  END IF;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ════════════════════════════════════════════════════════════
-- 9. club_spec_configurations → clubs
--    shaft_id → shaft_variant_id, grip_variant_id 追加
-- ════════════════════════════════════════════════════════════

ALTER TABLE club_spec_configurations RENAME TO clubs;

-- shaft_id → shaft_variant_id リネーム
ALTER TABLE clubs RENAME COLUMN shaft_id TO shaft_variant_id;

-- grip_variant_id 追加
ALTER TABLE clubs ADD COLUMN grip_variant_id uuid REFERENCES grip_variants(id) ON DELETE SET NULL;

-- RLS: 旧ポリシー削除 → 新ポリシー作成
DROP POLICY IF EXISTS "Deny all for non-service roles" ON clubs;
CREATE POLICY "Deny all for non-service roles" ON clubs FOR ALL USING (false);

-- 旧ユニーク制約削除
DROP INDEX IF EXISTS idx_configurations_head_shaft;
DROP INDEX IF EXISTS idx_configurations_head_null_shaft;

-- 新3パターンのユニーク制約
CREATE UNIQUE INDEX idx_clubs_head_shaft_grip
  ON clubs(head_id, shaft_variant_id, grip_variant_id)
  WHERE shaft_variant_id IS NOT NULL AND grip_variant_id IS NOT NULL;

CREATE UNIQUE INDEX idx_clubs_head_shaft_no_grip
  ON clubs(head_id, shaft_variant_id)
  WHERE shaft_variant_id IS NOT NULL AND grip_variant_id IS NULL;

CREATE UNIQUE INDEX idx_clubs_head_only
  ON clubs(head_id)
  WHERE shaft_variant_id IS NULL;

-- ════════════════════════════════════════════════════════════
-- 10. club_spec_series_shafts → club_model_shafts
--     variant-level → model-level 変換
-- ════════════════════════════════════════════════════════════

-- shaft_model_id カラム追加
ALTER TABLE club_spec_series_shafts ADD COLUMN shaft_model_id uuid;

-- shaft_variants.model_id から shaft_model_id をマッピング
UPDATE club_spec_series_shafts css
SET shaft_model_id = sv.model_id
FROM shaft_variants sv
WHERE css.shaft_id = sv.id;

-- 重複排除: 同一 series_id + shaft_model_id の組は1行だけ残す
DELETE FROM club_spec_series_shafts
WHERE id NOT IN (
  SELECT DISTINCT ON (series_id, shaft_model_id) id
  FROM club_spec_series_shafts
  ORDER BY series_id, shaft_model_id, created_at
);

-- 旧 shaft_id カラム・FK 削除
ALTER TABLE club_spec_series_shafts DROP COLUMN shaft_id;

-- shaft_model_id を NOT NULL に
ALTER TABLE club_spec_series_shafts ALTER COLUMN shaft_model_id SET NOT NULL;

-- FK 追加
ALTER TABLE club_spec_series_shafts ADD CONSTRAINT club_spec_series_shafts_shaft_model_id_fkey
  FOREIGN KEY (shaft_model_id) REFERENCES shaft_models(id) ON DELETE CASCADE;

-- series_id → model_id リネーム
ALTER TABLE club_spec_series_shafts RENAME COLUMN series_id TO model_id;

-- テーブルリネーム
ALTER TABLE club_spec_series_shafts RENAME TO club_model_shafts;

-- RLS: 旧ポリシー削除 → 新ポリシー作成
DROP POLICY IF EXISTS "Deny all for non-service roles" ON club_model_shafts;
CREATE POLICY "Deny all for non-service roles" ON club_model_shafts FOR ALL USING (false);

-- 旧ユニーク制約削除 → 新作成
DROP INDEX IF EXISTS idx_series_shafts_unique;
CREATE UNIQUE INDEX idx_club_model_shafts_unique ON club_model_shafts(model_id, shaft_model_id);

-- ════════════════════════════════════════════════════════════
-- 11. club_spec_series_grips → club_model_grips
--     variant-level → model-level 変換
-- ════════════════════════════════════════════════════════════

-- grip_model_id カラム追加
ALTER TABLE club_spec_series_grips ADD COLUMN grip_model_id uuid;

-- grip_variants.model_id から grip_model_id をマッピング
UPDATE club_spec_series_grips csg
SET grip_model_id = gv.model_id
FROM grip_variants gv
WHERE csg.grip_id = gv.id;

-- 重複排除: 同一 series_id + grip_model_id の組は1行だけ残す
DELETE FROM club_spec_series_grips
WHERE id NOT IN (
  SELECT DISTINCT ON (series_id, grip_model_id) id
  FROM club_spec_series_grips
  ORDER BY series_id, grip_model_id, created_at
);

-- 旧 grip_id カラム・FK 削除
ALTER TABLE club_spec_series_grips DROP COLUMN grip_id;

-- grip_model_id を NOT NULL に
ALTER TABLE club_spec_series_grips ALTER COLUMN grip_model_id SET NOT NULL;

-- FK 追加
ALTER TABLE club_spec_series_grips ADD CONSTRAINT club_spec_series_grips_grip_model_id_fkey
  FOREIGN KEY (grip_model_id) REFERENCES grip_models(id) ON DELETE CASCADE;

-- series_id → model_id リネーム
ALTER TABLE club_spec_series_grips RENAME COLUMN series_id TO model_id;

-- テーブルリネーム
ALTER TABLE club_spec_series_grips RENAME TO club_model_grips;

-- RLS: 旧ポリシー削除 → 新ポリシー作成
DROP POLICY IF EXISTS "Deny all for non-service roles" ON club_model_grips;
CREATE POLICY "Deny all for non-service roles" ON club_model_grips FOR ALL USING (false);

-- 旧ユニーク制約削除 → 新作成
DROP INDEX IF EXISTS idx_series_grips_unique;
CREATE UNIQUE INDEX idx_club_model_grips_unique ON club_model_grips(model_id, grip_model_id);

COMMIT;

-- ============================================================
-- 237: catalog_makers テーブル作成 + catalog_models リレーション
-- ============================================================

-- 1. メーカーテーブル作成
CREATE TABLE IF NOT EXISTS catalog_makers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE catalog_makers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON catalog_makers FOR SELECT USING (true);
CREATE POLICY "Service write" ON catalog_makers FOR ALL USING (false);

CREATE INDEX IF NOT EXISTS idx_catalog_makers_sort ON catalog_makers(sort_order, name);

CREATE TRIGGER catalog_makers_updated BEFORE UPDATE ON catalog_makers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. 既存の catalog_models.maker_slug からメーカーを生成
INSERT INTO catalog_makers (slug, name)
SELECT DISTINCT maker_slug, maker FROM catalog_models
ON CONFLICT (slug) DO NOTHING;

-- 3. catalog_models に maker_id FK 追加
ALTER TABLE catalog_models ADD COLUMN IF NOT EXISTS maker_id uuid REFERENCES catalog_makers(id);

-- 4. 既存データを紐付け
UPDATE catalog_models m
SET maker_id = mk.id
FROM catalog_makers mk
WHERE m.maker_slug = mk.slug;

-- 5. NOT NULL 制約
ALTER TABLE catalog_models ALTER COLUMN maker_id SET NOT NULL;

-- 6. インデックス
CREATE INDEX IF NOT EXISTS idx_catalog_models_maker_id ON catalog_models(maker_id);

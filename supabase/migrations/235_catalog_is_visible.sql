-- ============================================================
-- 235: catalog_models に表示/非表示フラグ追加
-- ============================================================
ALTER TABLE catalog_models ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_catalog_models_is_visible ON catalog_models(is_visible) WHERE is_visible = true;

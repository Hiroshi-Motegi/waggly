-- ============================================================
-- 251: モデル×シャフト中間テーブル
-- ============================================================

CREATE TABLE IF NOT EXISTS catalog_model_shafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES catalog_models(id) ON DELETE CASCADE,
  shaft_id uuid NOT NULL REFERENCES catalog_shafts(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (model_id, shaft_id)
);

ALTER TABLE catalog_model_shafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read model shafts" ON catalog_model_shafts FOR SELECT USING (true);
CREATE INDEX idx_catalog_model_shafts_model ON catalog_model_shafts(model_id);

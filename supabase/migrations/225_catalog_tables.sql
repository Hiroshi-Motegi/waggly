-- catalog_series（シリーズ = G440, Paradym Ai Smoke等）
CREATE TABLE catalog_series (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  maker text NOT NULL,
  name text NOT NULL,
  maker_slug text NOT NULL,
  name_slug text NOT NULL,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_catalog_series_slug ON catalog_series(maker_slug, name_slug);
ALTER TABLE catalog_series ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON catalog_series FOR SELECT USING (true);
CREATE POLICY "Service write" ON catalog_series FOR ALL USING (false);

-- catalog_models（モデル = G440アイアン, G440 MAXドライバー等）
CREATE TABLE catalog_models (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  series_id uuid NOT NULL REFERENCES catalog_series(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('driver','fairway_wood','utility','iron','wedge','putter')),
  category_slug text NOT NULL,
  head_material text,
  finish text,
  price integer,
  price_note text,
  release_year integer,
  shaft_names text[],
  grip_name text,
  url text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_catalog_models_series_cat ON catalog_models(series_id, category);
CREATE INDEX idx_catalog_models_category ON catalog_models(category);
ALTER TABLE catalog_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON catalog_models FOR SELECT USING (true);
CREATE POLICY "Service write" ON catalog_models FOR ALL USING (false);

-- catalog_specs（番手別スペック）
CREATE TABLE catalog_specs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id uuid NOT NULL REFERENCES catalog_models(id) ON DELETE CASCADE,
  club_number text NOT NULL,
  loft numeric,
  lie numeric,
  bounce numeric,
  length numeric,
  weight numeric,
  swing_weight text,
  head_volume numeric,
  head_weight numeric,
  face_angle numeric,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_catalog_specs_model_club ON catalog_specs(model_id, club_number);
ALTER TABLE catalog_specs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON catalog_specs FOR SELECT USING (true);
CREATE POLICY "Service write" ON catalog_specs FOR ALL USING (false);

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION catalog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER catalog_series_updated BEFORE UPDATE ON catalog_series
  FOR EACH ROW EXECUTE FUNCTION catalog_updated_at();
CREATE TRIGGER catalog_models_updated BEFORE UPDATE ON catalog_models
  FOR EACH ROW EXECUTE FUNCTION catalog_updated_at();
CREATE TRIGGER catalog_specs_updated BEFORE UPDATE ON catalog_specs
  FOR EACH ROW EXECUTE FUNCTION catalog_updated_at();

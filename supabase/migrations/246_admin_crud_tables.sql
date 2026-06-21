-- ============================================================
-- 246: Admin CRUD tables + column additions
-- ============================================================

-- ---- New table: catalog_shafts ----
CREATE TABLE IF NOT EXISTS catalog_shafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shaft_name text NOT NULL,
  maker text,
  shaft_type text,
  flex text,
  shaft_weight numeric,
  torque numeric,
  kick_point text,
  image_url text,
  is_visible boolean NOT NULL DEFAULT true,
  verification_status text NOT NULL DEFAULT 'unverified',
  spec_updated_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE catalog_shafts ENABLE ROW LEVEL SECURITY;

-- ---- New table: catalog_grips ----
CREATE TABLE IF NOT EXISTS catalog_grips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grip_name text NOT NULL,
  maker text,
  grip_size text,
  weight numeric,
  material text,
  image_url text,
  is_visible boolean NOT NULL DEFAULT true,
  verification_status text NOT NULL DEFAULT 'unverified',
  spec_updated_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE catalog_grips ENABLE ROW LEVEL SECURITY;

-- ---- New table: catalog_model_attributes ----
CREATE TABLE IF NOT EXISTS catalog_model_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES catalog_models(id) ON DELETE CASCADE,
  label text NOT NULL,
  value text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE catalog_model_attributes ENABLE ROW LEVEL SECURITY;

-- ---- New table: catalog_model_links ----
CREATE TABLE IF NOT EXISTS catalog_model_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES catalog_models(id) ON DELETE CASCADE,
  label text NOT NULL,
  url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE catalog_model_links ENABLE ROW LEVEL SECURITY;

-- ---- New table: catalog_model_images ----
CREATE TABLE IF NOT EXISTS catalog_model_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES catalog_models(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE catalog_model_images ENABLE ROW LEVEL SECURITY;

-- ---- Extend catalog_models ----
ALTER TABLE catalog_models ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified';
ALTER TABLE catalog_models ADD COLUMN IF NOT EXISTS spec_updated_at timestamptz;

-- ---- Extend clubs ----
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS catalog_model_id uuid REFERENCES catalog_models(id) ON DELETE SET NULL;

-- ---- RLS policies ----
-- Admin tables: service_role bypasses RLS, so no admin policies needed.
-- Public read for visible catalog data (used by public catalog pages):
CREATE POLICY "Public can read visible shafts" ON catalog_shafts FOR SELECT USING (is_visible = true);
CREATE POLICY "Public can read visible grips" ON catalog_grips FOR SELECT USING (is_visible = true);
CREATE POLICY "Public can read model attributes" ON catalog_model_attributes FOR SELECT USING (true);
CREATE POLICY "Public can read model links" ON catalog_model_links FOR SELECT USING (true);
CREATE POLICY "Public can read model images" ON catalog_model_images FOR SELECT USING (true);

-- ---- Indexes ----
CREATE INDEX IF NOT EXISTS idx_catalog_shafts_maker ON catalog_shafts(maker);
CREATE INDEX IF NOT EXISTS idx_catalog_grips_maker ON catalog_grips(maker);
CREATE INDEX IF NOT EXISTS idx_catalog_model_attributes_model ON catalog_model_attributes(model_id);
CREATE INDEX IF NOT EXISTS idx_catalog_model_links_model ON catalog_model_links(model_id);
CREATE INDEX IF NOT EXISTS idx_catalog_model_images_model ON catalog_model_images(model_id);
CREATE INDEX IF NOT EXISTS idx_clubs_catalog_model ON clubs(catalog_model_id) WHERE catalog_model_id IS NOT NULL;

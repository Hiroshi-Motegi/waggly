-- Add series_slug to catalog_models for grouping related products
-- (e.g. "g440" groups G440 Driver, FW, UT, Iron across categories)
ALTER TABLE catalog_models ADD COLUMN IF NOT EXISTS series_slug text;

CREATE INDEX IF NOT EXISTS idx_catalog_models_series_slug
  ON catalog_models(maker_slug, series_slug);

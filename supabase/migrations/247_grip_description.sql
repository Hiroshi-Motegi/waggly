-- ============================================================
-- 247: catalog_grips / catalog_makers に description, image_url 追加
-- ============================================================
ALTER TABLE catalog_grips ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE catalog_makers ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE catalog_makers ADD COLUMN IF NOT EXISTS description text;

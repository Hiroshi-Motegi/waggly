-- ============================================================
-- 238: catalog_makers にカタカナ名追加
-- ============================================================
ALTER TABLE catalog_makers ADD COLUMN IF NOT EXISTS name_ja text;

-- ============================================================
-- 252: catalog_model_shafts のロール権限付与
-- PostgRESTがテーブルを認識するために必要
-- ============================================================

GRANT SELECT ON catalog_model_shafts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON catalog_model_shafts TO authenticated;
GRANT ALL ON catalog_model_shafts TO service_role;

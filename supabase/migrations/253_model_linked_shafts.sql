-- ============================================================
-- 253: catalog_models にシャフトID配列カラムを追加
-- 中間テーブル(catalog_model_shafts)はPostgRESTに認識されないため
-- 既存テーブルのカラムで管理する
-- ============================================================

-- 中間テーブルを削除（251で作成したが使えなかった）
DROP TABLE IF EXISTS catalog_model_shafts CASCADE;
DROP FUNCTION IF EXISTS get_model_shafts(uuid);
DROP FUNCTION IF EXISTS add_model_shaft(uuid, uuid, int);
DROP FUNCTION IF EXISTS delete_model_shaft(uuid);

-- catalog_modelsにシャフトID配列を追加
ALTER TABLE catalog_models ADD COLUMN IF NOT EXISTS linked_shaft_ids uuid[] DEFAULT '{}';

-- 229_catalog_flatten.sql
-- catalog_series テーブルを廃止し、catalog_models にmaker情報を直接持たせるフラット構造に移行

-- slugカラム追加（本番DBに存在するがrecorded migrationに未記録の可能性）
ALTER TABLE catalog_models ADD COLUMN IF NOT EXISTS slug text;

-- catalog_models にmaker情報を直接追加
ALTER TABLE catalog_models ADD COLUMN IF NOT EXISTS maker text;
ALTER TABLE catalog_models ADD COLUMN IF NOT EXISTS maker_slug text;

-- golfnavi追加カラム
ALTER TABLE catalog_models ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE catalog_models ADD COLUMN IF NOT EXISTS release_month integer;
ALTER TABLE catalog_models ADD COLUMN IF NOT EXISTS head_manufacture text;
ALTER TABLE catalog_models ADD COLUMN IF NOT EXISTS sle_rule text;
ALTER TABLE catalog_models ADD COLUMN IF NOT EXISTS price_min integer;
ALTER TABLE catalog_models ADD COLUMN IF NOT EXISTS price_max integer;
ALTER TABLE catalog_models ADD COLUMN IF NOT EXISTS alpen_pid text;
ALTER TABLE catalog_models ADD COLUMN IF NOT EXISTS source_url text;

-- finishをhead_finishにリネーム（冪等: finishがない or head_finishが既にある場合をハンドル）
DO $$ BEGIN
  ALTER TABLE catalog_models RENAME COLUMN finish TO head_finish;
EXCEPTION
  WHEN undefined_column THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- 既存データのmaker情報をcatalog_seriesからコピー
UPDATE catalog_models m
SET maker = s.maker, maker_slug = s.maker_slug
FROM catalog_series s
WHERE m.series_id = s.id;

-- NOT NULL制約追加
ALTER TABLE catalog_models ALTER COLUMN maker SET NOT NULL;
ALTER TABLE catalog_models ALTER COLUMN maker_slug SET NOT NULL;

-- 不要カラム削除
ALTER TABLE catalog_models DROP COLUMN IF EXISTS series_id;
ALTER TABLE catalog_models DROP COLUMN IF EXISTS grip_name;
ALTER TABLE catalog_models DROP COLUMN IF EXISTS price_note;

-- urlカラムの値をsource_urlにコピーしてdrop
UPDATE catalog_models SET source_url = url WHERE url IS NOT NULL AND source_url IS NULL;
ALTER TABLE catalog_models DROP COLUMN IF EXISTS url;

-- 新しいユニーク制約: maker_slug + slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_catalog_models_maker_slug
  ON catalog_models(maker_slug, slug);

-- maker_slugインデックス
CREATE INDEX IF NOT EXISTS idx_catalog_models_maker
  ON catalog_models(maker_slug);

-- catalog_seriesテーブル削除（CASCADEで関連トリガー・FKも自動削除）
DROP TABLE IF EXISTS catalog_series CASCADE;

-- ============================================================
-- product_lines（製品ファミリー: G440, Paradym 等）追加
-- club_models から maker を分離
-- ============================================================

BEGIN;

-- ── 1. product_lines テーブル作成 ──

CREATE TABLE product_lines (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  maker text NOT NULL,
  maker_normalized text NOT NULL,
  name text NOT NULL,
  name_normalized text NOT NULL,
  image_url text,
  affiliate_url text,
  own_image_url text,
  source text NOT NULL DEFAULT 'ai',
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_product_lines_unique ON product_lines(maker_normalized, name_normalized);

ALTER TABLE product_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all for non-service roles" ON product_lines FOR ALL USING (false);

CREATE TRIGGER product_lines_updated_at
  BEFORE UPDATE ON product_lines
  FOR EACH ROW EXECUTE FUNCTION update_club_specs_updated_at();

-- ── 2. 既存 club_models から product_lines を生成 ──
-- maker + model の組み合わせからモデル名を抽出
-- 例: maker=PING, model=G440 → product_line = PING / G440
-- 現状 club_models.model がフルモデル名（"G440"）なのでそのまま使う

INSERT INTO product_lines (maker, maker_normalized, name, name_normalized, source)
SELECT DISTINCT ON (maker, model)
  maker,
  maker_normalized,
  model,
  model_normalized,
  'manual'
FROM club_models
ORDER BY maker, model, created_at;

-- ── 3. club_models に product_line_id 追加 ──

ALTER TABLE club_models ADD COLUMN product_line_id uuid;

UPDATE club_models cm SET product_line_id = pl.id
FROM product_lines pl
WHERE cm.maker = pl.maker AND cm.model = pl.name;

ALTER TABLE club_models ALTER COLUMN product_line_id SET NOT NULL;
ALTER TABLE club_models ADD CONSTRAINT club_models_product_line_id_fkey
  FOREIGN KEY (product_line_id) REFERENCES product_lines(id) ON DELETE CASCADE;

-- ── 4. club_models: maker/model → name に再構成 ──
-- 現状: maker="PING", model="G440" で1レコード = 1クラブ製品
-- 将来: product_line=(PING, G440), club_model.name="Iron" / "MAX Driver"
--
-- ただし既存データは maker+model で1つのclub_modelなので、
-- name カラムを追加して category_label をデフォルト値にする
-- maker, model は一旦残す（heads の非正規化フィールドとの整合性のため）

ALTER TABLE club_models ADD COLUMN name text;

-- name に category の日本語ラベルを設定（仮の値、あとで手動修正可能）
UPDATE club_models SET name = CASE category
  WHEN 'driver' THEN 'ドライバー'
  WHEN 'fairway_wood' THEN 'フェアウェイウッド'
  WHEN 'utility' THEN 'ユーティリティ'
  WHEN 'iron' THEN 'アイアン'
  WHEN 'wedge' THEN 'ウェッジ'
  WHEN 'putter' THEN 'パター'
  ELSE COALESCE(category, 'クラブ')
END;

-- ユニーク制約を更新: product_line_id + name + category
DROP INDEX IF EXISTS idx_club_models_unique;
CREATE UNIQUE INDEX idx_club_models_unique ON club_models(product_line_id, COALESCE(name, ''), COALESCE(category, ''));

COMMIT;

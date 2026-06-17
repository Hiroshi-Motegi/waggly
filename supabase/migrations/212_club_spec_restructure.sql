-- ============================================================
-- Club Spec DB Restructure: ヘッド/シャフト/グリップ分離
-- 旧テーブル(club_specs, club_spec_series)を破棄し新構造で再作成
-- ============================================================

-- ── 旧テーブル・オブジェクトの削除 ──

DROP FUNCTION IF EXISTS upsert_club_spec CASCADE;
DROP TABLE IF EXISTS club_specs CASCADE;
DROP TABLE IF EXISTS club_spec_series CASCADE;

-- ── 1. shafts（シャフト製品マスタ） ──

CREATE TABLE shafts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  maker text NOT NULL,
  maker_normalized text NOT NULL,
  name text NOT NULL,
  name_normalized text NOT NULL,
  type text,                          -- steel / carbon
  flex text,                          -- S, SR, R, X 等
  weight numeric,                     -- シャフト単体重量 (g)
  torque numeric,                     -- トルク (°)
  kick_point text,                    -- 調子（先, 中, 元）
  image_url text,
  affiliate_url text,
  own_image_url text,
  source text NOT NULL DEFAULT 'ai',
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_shafts_unique ON shafts(maker_normalized, name_normalized, COALESCE(flex, ''));

ALTER TABLE shafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all for non-service roles" ON shafts FOR ALL USING (false);

CREATE TRIGGER shafts_updated_at
  BEFORE UPDATE ON shafts
  FOR EACH ROW EXECUTE FUNCTION update_club_specs_updated_at();

-- ── 2. grips（グリップ製品マスタ） ──

CREATE TABLE grips (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  maker text NOT NULL,
  maker_normalized text NOT NULL,
  name text NOT NULL,
  name_normalized text NOT NULL,
  weight numeric,                     -- 重量 (g)
  size text,                          -- M58, M60 等
  material text,                      -- ラバー, コード, エラストマー 等
  image_url text,
  affiliate_url text,
  own_image_url text,
  source text NOT NULL DEFAULT 'ai',
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_grips_unique ON grips(maker_normalized, name_normalized, COALESCE(size, ''));

ALTER TABLE grips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all for non-service roles" ON grips FOR ALL USING (false);

CREATE TRIGGER grips_updated_at
  BEFORE UPDATE ON grips
  FOR EACH ROW EXECUTE FUNCTION update_club_specs_updated_at();

-- ── 3. club_spec_series（シリーズ = 完成品モデル） ──

CREATE TABLE club_spec_series (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  maker text NOT NULL,
  model text NOT NULL,
  image_url text,
  affiliate_url text,
  own_image_url text,
  source text NOT NULL DEFAULT 'ai',
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_club_spec_series_unique ON club_spec_series(maker, model);

ALTER TABLE club_spec_series ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all for non-service roles" ON club_spec_series FOR ALL USING (false);

CREATE TRIGGER club_spec_series_updated_at
  BEFORE UPDATE ON club_spec_series
  FOR EACH ROW EXECUTE FUNCTION update_club_specs_updated_at();

-- ── 4. club_spec_heads（ヘッドスペック） ──

CREATE TABLE club_spec_heads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  series_id uuid REFERENCES club_spec_series(id) ON DELETE SET NULL,
  maker text NOT NULL,
  model text NOT NULL,
  category text NOT NULL,
  club_number text,
  maker_normalized text NOT NULL,
  model_normalized text NOT NULL,
  loft numeric,
  lie numeric,
  head_volume numeric,                -- ヘッド体積 (cc)
  head_weight numeric,                -- ヘッド重量 (g)
  head_weight_source text,            -- published / calculated / null
  distance numeric,                   -- 飛距離目安 (yd) — ロフト依存の参考値
  image_url text,
  own_image_url text,
  affiliate_url text,
  source text NOT NULL DEFAULT 'ai',
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 単体ヘッド + autofill検索用
CREATE UNIQUE INDEX idx_club_spec_heads_unique
  ON club_spec_heads(maker_normalized, model_normalized, category, COALESCE(club_number, ''));

-- autofillルックアップ用
CREATE INDEX idx_club_spec_heads_lookup
  ON club_spec_heads(maker_normalized, model_normalized, category);

-- シリーズ内ユニーク
CREATE UNIQUE INDEX idx_club_spec_heads_series_unique
  ON club_spec_heads(series_id, category, COALESCE(club_number, ''))
  WHERE series_id IS NOT NULL;

-- シリーズ検索用
CREATE INDEX idx_club_spec_heads_series
  ON club_spec_heads(series_id) WHERE series_id IS NOT NULL;

ALTER TABLE club_spec_heads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all for non-service roles" ON club_spec_heads FOR ALL USING (false);

CREATE TRIGGER club_spec_heads_updated_at
  BEFORE UPDATE ON club_spec_heads
  FOR EACH ROW EXECUTE FUNCTION update_club_specs_updated_at();

-- UPSERT function (skips update if verified=true)
CREATE OR REPLACE FUNCTION upsert_club_spec_head(
  p_maker text,
  p_model text,
  p_category text,
  p_club_number text,
  p_maker_normalized text,
  p_model_normalized text,
  p_loft numeric,
  p_lie numeric,
  p_head_volume numeric,
  p_head_weight numeric,
  p_distance numeric,
  p_image_url text,
  p_affiliate_url text
) RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO club_spec_heads (
    maker, model, category, club_number,
    maker_normalized, model_normalized,
    loft, lie, head_volume, head_weight, distance,
    image_url, affiliate_url, source, verified
  ) VALUES (
    p_maker, p_model, p_category, p_club_number,
    p_maker_normalized, p_model_normalized,
    p_loft, p_lie, p_head_volume, p_head_weight, p_distance,
    p_image_url, p_affiliate_url, 'ai', false
  )
  ON CONFLICT (maker_normalized, model_normalized, category, COALESCE(club_number, ''))
  DO UPDATE SET
    loft = EXCLUDED.loft,
    lie = EXCLUDED.lie,
    head_volume = EXCLUDED.head_volume,
    head_weight = EXCLUDED.head_weight,
    distance = EXCLUDED.distance,
    image_url = EXCLUDED.image_url,
    affiliate_url = EXCLUDED.affiliate_url
  WHERE club_spec_heads.verified = false
  RETURNING id INTO v_id;

  -- ON CONFLICT DO NOTHING の場合（verified=true）は既存IDを取得
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM club_spec_heads
    WHERE maker_normalized = p_maker_normalized
      AND model_normalized = p_model_normalized
      AND category = p_category
      AND COALESCE(club_number, '') = COALESCE(p_club_number, '');
  END IF;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 5. club_spec_series_shafts（シリーズ×シャフト紐づけ） ──

CREATE TABLE club_spec_series_shafts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  series_id uuid NOT NULL REFERENCES club_spec_series(id) ON DELETE CASCADE,
  shaft_id uuid NOT NULL REFERENCES shafts(id) ON DELETE CASCADE,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_series_shafts_unique ON club_spec_series_shafts(series_id, shaft_id);

ALTER TABLE club_spec_series_shafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all for non-service roles" ON club_spec_series_shafts FOR ALL USING (false);

CREATE TRIGGER series_shafts_updated_at
  BEFORE UPDATE ON club_spec_series_shafts
  FOR EACH ROW EXECUTE FUNCTION update_club_specs_updated_at();

-- ── 6. club_spec_series_grips（シリーズ×グリップ紐づけ） ──

CREATE TABLE club_spec_series_grips (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  series_id uuid NOT NULL REFERENCES club_spec_series(id) ON DELETE CASCADE,
  grip_id uuid NOT NULL REFERENCES grips(id) ON DELETE CASCADE,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_series_grips_unique ON club_spec_series_grips(series_id, grip_id);

ALTER TABLE club_spec_series_grips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all for non-service roles" ON club_spec_series_grips FOR ALL USING (false);

CREATE TRIGGER series_grips_updated_at
  BEFORE UPDATE ON club_spec_series_grips
  FOR EACH ROW EXECUTE FUNCTION update_club_specs_updated_at();

-- ── 7. club_spec_configurations（番手×シャフト別の公称スペック） ──

CREATE TABLE club_spec_configurations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  head_id uuid NOT NULL REFERENCES club_spec_heads(id) ON DELETE CASCADE,
  shaft_id uuid REFERENCES shafts(id) ON DELETE SET NULL,  -- null = シャフト未特定
  length numeric,                     -- クラブ長さ (inch)
  total_weight numeric,               -- 総重量 (g) — ヘッド+シャフト+標準グリップ
  swing_weight text,                  -- バランス (D0, D1 等)
  assumed_grip_weight numeric,        -- 総重量に含まれたグリップ重量 (g)
  source text NOT NULL DEFAULT 'ai',
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- shaft_idありのユニーク
CREATE UNIQUE INDEX idx_configurations_head_shaft
  ON club_spec_configurations(head_id, shaft_id)
  WHERE shaft_id IS NOT NULL;

-- shaft_id=nullは1ヘッドにつき1レコードのみ
CREATE UNIQUE INDEX idx_configurations_head_null_shaft
  ON club_spec_configurations(head_id)
  WHERE shaft_id IS NULL;

ALTER TABLE club_spec_configurations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all for non-service roles" ON club_spec_configurations FOR ALL USING (false);

CREATE TRIGGER configurations_updated_at
  BEFORE UPDATE ON club_spec_configurations
  FOR EACH ROW EXECUTE FUNCTION update_club_specs_updated_at();

-- ── 8. Storageバケット（既存なら何もしない） ──

INSERT INTO storage.buckets (id, name, public) VALUES ('club-spec-images', 'club-spec-images', true)
ON CONFLICT (id) DO NOTHING;

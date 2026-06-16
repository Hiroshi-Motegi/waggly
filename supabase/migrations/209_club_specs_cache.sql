CREATE TABLE club_specs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  maker text NOT NULL,
  model text NOT NULL,
  category text NOT NULL,
  club_number text,
  maker_normalized text NOT NULL,
  model_normalized text NOT NULL,
  loft numeric,
  lie numeric,
  length numeric,
  distance numeric,
  weight numeric,
  swing_weight text,
  head_volume numeric,
  head_weight numeric,
  image_url text,
  affiliate_url text,
  source text NOT NULL DEFAULT 'ai',
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- NULLセーフなユニークインデックス
CREATE UNIQUE INDEX idx_club_specs_unique
  ON club_specs(maker_normalized, model_normalized, category, COALESCE(club_number, ''));

CREATE INDEX idx_club_specs_lookup
  ON club_specs(maker_normalized, model_normalized, category);

ALTER TABLE club_specs ENABLE ROW LEVEL SECURITY;

-- service roleはRLSをバイパスして直接アクセス。anon/authenticatedは全拒否。
CREATE POLICY "Deny all for non-service roles" ON club_specs
  FOR ALL USING (false);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_club_specs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER club_specs_updated_at
  BEFORE UPDATE ON club_specs
  FOR EACH ROW EXECUTE FUNCTION update_club_specs_updated_at();

-- UPSERT function (skips update if verified=true)
CREATE OR REPLACE FUNCTION upsert_club_spec(
  p_maker text,
  p_model text,
  p_category text,
  p_club_number text,
  p_maker_normalized text,
  p_model_normalized text,
  p_loft numeric,
  p_lie numeric,
  p_length numeric,
  p_distance numeric,
  p_weight numeric,
  p_swing_weight text,
  p_head_volume numeric,
  p_head_weight numeric,
  p_image_url text,
  p_affiliate_url text
) RETURNS void AS $$
BEGIN
  INSERT INTO club_specs (
    maker, model, category, club_number,
    maker_normalized, model_normalized,
    loft, lie, length, distance, weight, swing_weight, head_volume, head_weight,
    image_url, affiliate_url, source, verified
  ) VALUES (
    p_maker, p_model, p_category, p_club_number,
    p_maker_normalized, p_model_normalized,
    p_loft, p_lie, p_length, p_distance, p_weight, p_swing_weight, p_head_volume, p_head_weight,
    p_image_url, p_affiliate_url, 'ai', false
  )
  ON CONFLICT (maker_normalized, model_normalized, category, COALESCE(club_number, ''))
  DO UPDATE SET
    loft = EXCLUDED.loft,
    lie = EXCLUDED.lie,
    length = EXCLUDED.length,
    distance = EXCLUDED.distance,
    weight = EXCLUDED.weight,
    swing_weight = EXCLUDED.swing_weight,
    head_volume = EXCLUDED.head_volume,
    head_weight = EXCLUDED.head_weight,
    image_url = EXCLUDED.image_url,
    affiliate_url = EXCLUDED.affiliate_url
  WHERE club_specs.verified = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

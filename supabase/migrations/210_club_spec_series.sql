-- シリーズテーブル（アイアンセット等、複数番手で画像・リンクを共有）
CREATE TABLE club_spec_series (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  maker text NOT NULL,
  model text NOT NULL,
  image_url text,
  affiliate_url text,
  source text NOT NULL DEFAULT 'ai',
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_club_spec_series_unique ON club_spec_series(maker, model);

ALTER TABLE club_spec_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all for non-service roles" ON club_spec_series
  FOR ALL USING (false);

-- updated_at 自動更新
CREATE TRIGGER club_spec_series_updated_at
  BEFORE UPDATE ON club_spec_series
  FOR EACH ROW EXECUTE FUNCTION update_club_specs_updated_at();

-- club_specs に series_id を追加
ALTER TABLE club_specs ADD COLUMN series_id uuid REFERENCES club_spec_series(id) ON DELETE SET NULL;

CREATE INDEX idx_club_specs_series ON club_specs(series_id) WHERE series_id IS NOT NULL;

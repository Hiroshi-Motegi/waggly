-- 自前画像用バケット
INSERT INTO storage.buckets (id, name, public) VALUES ('club-spec-images', 'club-spec-images', true)
ON CONFLICT (id) DO NOTHING;

-- club_specs に自前画像カラム追加
ALTER TABLE club_specs ADD COLUMN IF NOT EXISTS own_image_url text;

-- club_spec_series に自前画像カラム追加
ALTER TABLE club_spec_series ADD COLUMN IF NOT EXISTS own_image_url text;

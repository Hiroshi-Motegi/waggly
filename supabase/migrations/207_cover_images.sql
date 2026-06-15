CREATE TABLE profile_cover_images (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_profile_cover_images_user ON profile_cover_images(user_id);

ALTER TABLE profile_cover_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own cover images"
  ON profile_cover_images FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Public can view cover images"
  ON profile_cover_images FOR SELECT
  USING (true);

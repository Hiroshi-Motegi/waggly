-- ユーザーのお気に入りクラブ（カタログモデル）
CREATE TABLE favorite_clubs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id uuid NOT NULL REFERENCES catalog_models(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, model_id)
);

CREATE INDEX idx_favorite_clubs_user ON favorite_clubs(user_id);
ALTER TABLE favorite_clubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own favorites" ON favorite_clubs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Auth Architecture Redesign: Full Reset Migration
-- ============================================================
-- users.id を auth.users.id から独立させ、
-- user_providers ジャンクションテーブルでプロバイダを管理する。
-- 未公開のためデータ全削除で移行。
-- ============================================================

-- 1. 既存Storage policies DROP
DROP POLICY IF EXISTS "Users can upload club images" ON storage.objects;
DROP POLICY IF EXISTS "Users can read club images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own club images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;

-- 2. 既存テーブルを全DROP（依存順）
DROP TABLE IF EXISTS public.ai_chats CASCADE;
DROP TABLE IF EXISTS public.practice_plan_items CASCADE;
DROP TABLE IF EXISTS public.practice_plans CASCADE;
DROP TABLE IF EXISTS public.practice_clubs CASCADE;
DROP TABLE IF EXISTS public.practice_sessions CASCADE;
DROP TABLE IF EXISTS public.club_memos CASCADE;
DROP TABLE IF EXISTS public.club_images CASCADE;
DROP TABLE IF EXISTS public.maintenances CASCADE;
DROP TABLE IF EXISTS public.accessories CASCADE;
DROP TABLE IF EXISTS public.favorite_courses CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.clubs CASCADE;
DROP TABLE IF EXISTS public.knowledge_base CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- 3. 新 users テーブル（auth.users.id への FK なし = 独自UUID）
CREATE TABLE public.users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name    TEXT NOT NULL,
  avatar_url      TEXT,
  google_email    TEXT,
  agreed_terms_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 4. user_providers ジャンクションテーブル
CREATE TABLE public.user_providers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL,
  auth_user_id    UUID,
  provider_sub    TEXT NOT NULL,
  provider_email  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_sub),
  UNIQUE(provider, auth_user_id)
);
CREATE INDEX idx_user_providers_auth_user_id ON public.user_providers(auth_user_id);
CREATE INDEX idx_user_providers_provider_sub ON public.user_providers(provider, provider_sub);
ALTER TABLE public.user_providers ENABLE ROW LEVEL SECURITY;

-- 5. データテーブル再作成
CREATE TABLE public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('driver','fairway_wood','utility','iron','wedge','putter')),
  club_number TEXT NOT NULL,
  maker TEXT,
  model TEXT,
  shaft_name TEXT,
  shaft_flex TEXT,
  loft NUMERIC,
  lie NUMERIC,
  length NUMERIC,
  distance INTEGER,
  release_year INTEGER,
  memo TEXT,
  purchase_date DATE,
  purchase_shop TEXT,
  purchase_price INTEGER,
  status TEXT NOT NULL DEFAULT 'bag' CHECK (status IN ('bag','reserve','sold')),
  bag_number INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  weight NUMERIC,
  swing_weight TEXT,
  frequency NUMERIC,
  kick_point TEXT,
  head_volume NUMERIC,
  head_weight NUMERIC,
  rating INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX clubs_user_id_idx ON public.clubs(user_id);
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.club_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX club_images_club_id_idx ON public.club_images(club_id);
ALTER TABLE public.club_images ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.club_memos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  distance NUMERIC,
  balls INTEGER,
  memo TEXT,
  condition TEXT CHECK (condition IN ('good','normal','bad')),
  symptom_tags JSONB DEFAULT '[]',
  feeling_tags JSONB DEFAULT '[]',
  gear_tags JSONB DEFAULT '[]',
  practice_session_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX club_memos_club_id_idx ON public.club_memos(club_id);
ALTER TABLE public.club_memos ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.maintenances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('grip_change','reshaft','loft_adjust','other')),
  description TEXT,
  shop TEXT,
  cost INTEGER,
  done_at DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX maintenances_club_id_idx ON public.maintenances(club_id);
ALTER TABLE public.maintenances ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.accessories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('ball','glove','tee','apparel','bag','rangefinder','grip','shaft','other')),
  brand TEXT,
  model TEXT,
  memo TEXT,
  rating INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','past')),
  purchase_url TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX accessories_user_id_idx ON public.accessories(user_id);
ALTER TABLE public.accessories ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  practiced_at DATE NOT NULL DEFAULT current_date,
  location TEXT,
  total_balls INTEGER,
  memo TEXT,
  rating INTEGER,
  plan_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX practice_sessions_user_id_idx ON public.practice_sessions(user_id);
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.practice_clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.practice_sessions(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  balls INTEGER NOT NULL DEFAULT 0,
  avg_distance NUMERIC
);
CREATE INDEX practice_clubs_session_id_idx ON public.practice_clubs(session_id);
ALTER TABLE public.practice_clubs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.practice_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('auto','chat')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','done','skipped')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX practice_plans_user_id_idx ON public.practice_plans(user_id);
ALTER TABLE public.practice_plans ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.practice_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.practice_plans(id) ON DELETE CASCADE,
  club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL,
  balls INTEGER NOT NULL,
  focus TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX practice_plan_items_plan_id_idx ON public.practice_plan_items(plan_id);
ALTER TABLE public.practice_plan_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.ai_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ai_chats_user_id_idx ON public.ai_chats(user_id);
CREATE INDEX ai_chats_conversation_id_idx ON public.ai_chats(conversation_id);
ALTER TABLE public.ai_chats ENABLE ROW LEVEL SECURITY;

-- profiles は users(id) を参照（auth.users ではない）
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  nickname TEXT,
  avatar_url TEXT,
  golf_start_date DATE,
  average_score INTEGER,
  best_score INTEGER,
  home_course TEXT,
  bio TEXT,
  sns_links JSONB DEFAULT '{}',
  is_public BOOLEAN NOT NULL DEFAULT false,
  visible_fields JSONB DEFAULT '{"nickname":true,"golf_start_date":true,"average_score":true,"best_score":true,"home_course":true,"bio":true,"bag":true,"favorite_courses":true,"sns_links":true}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX profiles_username_idx ON public.profiles(username);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.favorite_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  gora_course_id INTEGER,
  course_name TEXT NOT NULL,
  course_image_url TEXT,
  evaluation NUMERIC,
  address TEXT,
  is_manual BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX favorite_courses_user_id_idx ON public.favorite_courses(user_id);
ALTER TABLE public.favorite_courses ENABLE ROW LEVEL SECURITY;

-- knowledge_base
CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT,
  source_url TEXT,
  auto_collected BOOLEAN DEFAULT false,
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. RLSポリシー（user_providers サブクエリ経由）

-- users
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT USING (
    id IN (SELECT user_id FROM public.user_providers WHERE auth_user_id = auth.uid())
  );
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (
    id IN (SELECT user_id FROM public.user_providers WHERE auth_user_id = auth.uid())
  );
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (true);

-- user_providers
CREATE POLICY "Users can read own providers" ON public.user_providers
  FOR SELECT USING (auth_user_id = auth.uid());

-- clubs
CREATE POLICY "Users can CRUD own clubs" ON public.clubs
  FOR ALL USING (
    user_id IN (SELECT user_id FROM public.user_providers WHERE auth_user_id = auth.uid())
  );

-- club_images
CREATE POLICY "Users can CRUD own club images" ON public.club_images
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.clubs
      WHERE clubs.id = club_images.club_id
      AND clubs.user_id IN (SELECT user_id FROM public.user_providers WHERE auth_user_id = auth.uid())
    )
  );

-- club_memos
CREATE POLICY "Users can CRUD own club memos" ON public.club_memos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.clubs
      WHERE clubs.id = club_memos.club_id
      AND clubs.user_id IN (SELECT user_id FROM public.user_providers WHERE auth_user_id = auth.uid())
    )
  );

-- maintenances
CREATE POLICY "Users can CRUD own maintenances" ON public.maintenances
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.clubs
      WHERE clubs.id = maintenances.club_id
      AND clubs.user_id IN (SELECT user_id FROM public.user_providers WHERE auth_user_id = auth.uid())
    )
  );

-- accessories
CREATE POLICY "Users can CRUD own accessories" ON public.accessories
  FOR ALL USING (
    user_id IN (SELECT user_id FROM public.user_providers WHERE auth_user_id = auth.uid())
  );

-- practice_sessions
CREATE POLICY "Users can CRUD own practice sessions" ON public.practice_sessions
  FOR ALL USING (
    user_id IN (SELECT user_id FROM public.user_providers WHERE auth_user_id = auth.uid())
  );

-- practice_clubs
CREATE POLICY "Users can CRUD own practice clubs" ON public.practice_clubs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.practice_sessions
      WHERE practice_sessions.id = practice_clubs.session_id
      AND practice_sessions.user_id IN (SELECT user_id FROM public.user_providers WHERE auth_user_id = auth.uid())
    )
  );

-- practice_plans
CREATE POLICY "Users can CRUD own practice plans" ON public.practice_plans
  FOR ALL USING (
    user_id IN (SELECT user_id FROM public.user_providers WHERE auth_user_id = auth.uid())
  );

-- practice_plan_items
CREATE POLICY "Users can CRUD own plan items" ON public.practice_plan_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.practice_plans
      WHERE practice_plans.id = practice_plan_items.plan_id
      AND practice_plans.user_id IN (SELECT user_id FROM public.user_providers WHERE auth_user_id = auth.uid())
    )
  );

-- ai_chats
CREATE POLICY "Users can CRUD own chats" ON public.ai_chats
  FOR ALL USING (
    user_id IN (SELECT user_id FROM public.user_providers WHERE auth_user_id = auth.uid())
  );

-- profiles
CREATE POLICY "Users can CRUD own profile card" ON public.profiles
  FOR ALL USING (
    id IN (SELECT user_id FROM public.user_providers WHERE auth_user_id = auth.uid())
  );
CREATE POLICY "Public profiles are readable" ON public.profiles
  FOR SELECT USING (is_public = true);

-- favorite_courses
CREATE POLICY "Users can CRUD own favorite courses" ON public.favorite_courses
  FOR ALL USING (
    user_id IN (SELECT user_id FROM public.user_providers WHERE auth_user_id = auth.uid())
  );
CREATE POLICY "Public favorite courses are readable" ON public.favorite_courses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = favorite_courses.user_id
      AND profiles.is_public = true
    )
  );

-- 7. Storage policies
INSERT INTO storage.buckets (id, name, public) VALUES ('club-images', 'club-images', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload club images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'club-images' AND auth.role() = 'authenticated');
CREATE POLICY "Club images are publicly readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'club-images');
CREATE POLICY "Users can delete own club images" ON storage.objects
  FOR DELETE USING (bucket_id = 'club-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own avatar" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Avatars are publicly readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

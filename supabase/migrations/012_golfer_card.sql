-- Profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  nickname text,
  avatar_url text,
  golf_experience_years integer,
  average_score integer,
  best_score integer,
  home_course text,
  bio text,
  sns_links jsonb DEFAULT '{}',
  is_public boolean NOT NULL DEFAULT false,
  visible_fields jsonb DEFAULT '{"nickname":true,"golf_experience_years":true,"average_score":true,"best_score":true,"home_course":true,"bio":true,"bag":true,"favorite_courses":true,"sns_links":true}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Owner can do anything
CREATE POLICY "Users can CRUD own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- Anyone can read public profiles
CREATE POLICY "Public profiles are readable" ON public.profiles
  FOR SELECT USING (is_public = true);

CREATE INDEX profiles_username_idx ON public.profiles(username);

-- Favorite courses table
CREATE TABLE public.favorite_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  gora_course_id integer,
  course_name text NOT NULL,
  course_image_url text,
  evaluation numeric,
  address text,
  is_manual boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.favorite_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own favorite courses" ON public.favorite_courses
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public favorite courses are readable" ON public.favorite_courses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = favorite_courses.user_id
      AND profiles.is_public = true
    )
  );

CREATE INDEX favorite_courses_user_id_idx ON public.favorite_courses(user_id);

-- Storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own avatar" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Avatars are publicly readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

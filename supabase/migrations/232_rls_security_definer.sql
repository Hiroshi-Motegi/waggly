-- ============================================================
-- 232: get_my_user_id() SECURITY DEFINER + 全RLSポリシー書き換え
-- ============================================================
-- 目的: user_providers への副問合せを SECURITY DEFINER 関数に閉じ込め、
--       RLSポリシーの再帰チェーンを解消する。
--       これにより PostgREST のネストselect (club_images等) で
--       RLSが正しく評価されるようになる。

-- 1. SECURITY DEFINER 関数
CREATE OR REPLACE FUNCTION public.get_my_user_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT up.user_id
  FROM public.user_providers up
  WHERE up.auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- 2. user_providers は変更不要（auth_user_id = auth.uid() で正しい）

-- ============================================================
-- 2.5 favorite_clubs FK 修正: auth.users(id) → public.users(id)
-- migration 226 で auth.users(id) を参照していたが、
-- API は public.users.id で INSERT するため不整合。
-- ============================================================
ALTER TABLE public.favorite_clubs DROP CONSTRAINT IF EXISTS favorite_clubs_user_id_fkey;
ALTER TABLE public.favorite_clubs
  ADD CONSTRAINT favorite_clubs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- ============================================================
-- 3. 全ポリシー書き換え: user_providers 副問合せ → get_my_user_id()
-- ============================================================

-- --- users ---
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT USING (id = get_my_user_id());

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (id = get_my_user_id());

-- INSERT は変更不要 (WITH CHECK (true))

-- --- clubs ---
DROP POLICY IF EXISTS "Users can CRUD own clubs" ON public.clubs;
CREATE POLICY "Users can CRUD own clubs" ON public.clubs
  FOR ALL USING (user_id = get_my_user_id());

-- --- club_images ---
DROP POLICY IF EXISTS "Users can CRUD own club images" ON public.club_images;
CREATE POLICY "Users can CRUD own club images" ON public.club_images
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.clubs
      WHERE clubs.id = club_images.club_id
        AND clubs.user_id = get_my_user_id()
    )
  );

-- --- club_memos ---
DROP POLICY IF EXISTS "Users can CRUD own club memos" ON public.club_memos;
CREATE POLICY "Users can CRUD own club memos" ON public.club_memos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.clubs
      WHERE clubs.id = club_memos.club_id
        AND clubs.user_id = get_my_user_id()
    )
  );

-- --- maintenances ---
DROP POLICY IF EXISTS "Users can CRUD own maintenances" ON public.maintenances;
CREATE POLICY "Users can CRUD own maintenances" ON public.maintenances
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.clubs
      WHERE clubs.id = maintenances.club_id
        AND clubs.user_id = get_my_user_id()
    )
  );

-- --- accessories ---
DROP POLICY IF EXISTS "Users can CRUD own accessories" ON public.accessories;
CREATE POLICY "Users can CRUD own accessories" ON public.accessories
  FOR ALL USING (user_id = get_my_user_id());

-- --- accessory_images (231 で作成済みを上書き) ---
DROP POLICY IF EXISTS "Users can CRUD own accessory images" ON public.accessory_images;
CREATE POLICY "Users can CRUD own accessory images" ON public.accessory_images
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.accessories
      WHERE accessories.id = accessory_images.accessory_id
        AND accessories.user_id = get_my_user_id()
    )
  );

-- --- practice_sessions ---
DROP POLICY IF EXISTS "Users can CRUD own practice sessions" ON public.practice_sessions;
CREATE POLICY "Users can CRUD own practice sessions" ON public.practice_sessions
  FOR ALL USING (user_id = get_my_user_id());

-- --- practice_clubs ---
DROP POLICY IF EXISTS "Users can CRUD own practice clubs" ON public.practice_clubs;
CREATE POLICY "Users can CRUD own practice clubs" ON public.practice_clubs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.practice_sessions
      WHERE practice_sessions.id = practice_clubs.session_id
        AND practice_sessions.user_id = get_my_user_id()
    )
  );

-- --- practice_plans ---
DROP POLICY IF EXISTS "Users can CRUD own practice plans" ON public.practice_plans;
CREATE POLICY "Users can CRUD own practice plans" ON public.practice_plans
  FOR ALL USING (user_id = get_my_user_id());

-- --- practice_plan_items ---
DROP POLICY IF EXISTS "Users can CRUD own plan items" ON public.practice_plan_items;
CREATE POLICY "Users can CRUD own plan items" ON public.practice_plan_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.practice_plans
      WHERE practice_plans.id = practice_plan_items.plan_id
        AND practice_plans.user_id = get_my_user_id()
    )
  );

-- --- ai_chats ---
DROP POLICY IF EXISTS "Users can CRUD own chats" ON public.ai_chats;
CREATE POLICY "Users can CRUD own chats" ON public.ai_chats
  FOR ALL USING (user_id = get_my_user_id());

-- --- profiles ---
DROP POLICY IF EXISTS "Users can CRUD own profile card" ON public.profiles;
CREATE POLICY "Users can CRUD own profile card" ON public.profiles
  FOR ALL USING (id = get_my_user_id());
-- "Public profiles are readable" は変更不要 (is_public = true)

-- --- favorite_courses ---
DROP POLICY IF EXISTS "Users can CRUD own favorite courses" ON public.favorite_courses;
CREATE POLICY "Users can CRUD own favorite courses" ON public.favorite_courses
  FOR ALL USING (user_id = get_my_user_id());
-- "Public favorite courses are readable" は変更不要

-- --- profile_cover_images (231 で作成済みを上書き) ---
DROP POLICY IF EXISTS "Users can manage own cover images" ON public.profile_cover_images;
CREATE POLICY "Users can manage own cover images" ON public.profile_cover_images
  FOR ALL USING (user_id = get_my_user_id())
  WITH CHECK (user_id = get_my_user_id());

-- --- favorite_clubs (231 で作成済みを上書き) ---
DROP POLICY IF EXISTS "Users manage own favorites" ON public.favorite_clubs;
CREATE POLICY "Users manage own favorites" ON public.favorite_clubs
  FOR ALL USING (user_id = get_my_user_id())
  WITH CHECK (user_id = get_my_user_id());

-- --- subscriptions (200) ---
DROP POLICY IF EXISTS "Users can read own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can read own subscriptions" ON public.subscriptions
  FOR SELECT USING (user_id = get_my_user_id());

-- --- coupon_redemptions (200) ---
DROP POLICY IF EXISTS "Users can read own redemptions" ON public.coupon_redemptions;
CREATE POLICY "Users can read own redemptions" ON public.coupon_redemptions
  FOR SELECT USING (user_id = get_my_user_id());

-- --- ai_usage_counters (200) ---
DROP POLICY IF EXISTS "Users can read own counters" ON public.ai_usage_counters;
CREATE POLICY "Users can read own counters" ON public.ai_usage_counters
  FOR SELECT USING (user_id = get_my_user_id());

-- --- ai_usage (200) ---
DROP POLICY IF EXISTS "Users can read own usage" ON public.ai_usage;
CREATE POLICY "Users can read own usage" ON public.ai_usage
  FOR SELECT USING (user_id = get_my_user_id());

-- --- account_deletion_reasons (230) ---
DROP POLICY IF EXISTS "Users can insert own deletion reason" ON public.account_deletion_reasons;
CREATE POLICY "Users can insert own deletion reason" ON public.account_deletion_reasons
  FOR INSERT WITH CHECK (user_id = get_my_user_id());

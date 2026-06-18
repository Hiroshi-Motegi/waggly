-- auth redesign 後、auth.uid() は auth.users.id を返すが、データテーブルの user_id は users.id。
-- user_providers 経由の lookup に統一する。

-- 1. accessory_images: accessories.user_id = auth.uid() → user_providers 経由
DROP POLICY IF EXISTS "Users can CRUD own accessory images" ON public.accessory_images;
CREATE POLICY "Users can CRUD own accessory images" ON public.accessory_images FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.accessories
    WHERE accessories.id = accessory_images.accessory_id
      AND accessories.user_id IN (SELECT up.user_id FROM user_providers up WHERE up.auth_user_id = auth.uid())
  ));

-- 2. profile_cover_images: user_id = auth.uid() → user_providers 経由
DROP POLICY IF EXISTS "Users can manage own cover images" ON public.profile_cover_images;
CREATE POLICY "Users can manage own cover images" ON public.profile_cover_images FOR ALL
  USING (user_id IN (SELECT up.user_id FROM user_providers up WHERE up.auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT up.user_id FROM user_providers up WHERE up.auth_user_id = auth.uid()));

-- 3. favorite_clubs: auth.uid() = user_id → user_providers 経由
DROP POLICY IF EXISTS "Users manage own favorites" ON public.favorite_clubs;
CREATE POLICY "Users manage own favorites" ON public.favorite_clubs FOR ALL
  USING (user_id IN (SELECT up.user_id FROM user_providers up WHERE up.auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT up.user_id FROM user_providers up WHERE up.auth_user_id = auth.uid()));

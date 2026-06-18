-- ============================================================
-- 233: knowledge_base / knowledge_auto_runs の RLS を管理者限定に
-- ============================================================
-- 目的: 全認証ユーザーが書き込み可能だった知識ベーステーブルを
--       SELECT のみ認証ユーザー、変更操作は service_role のみに制限する。

-- --- knowledge_base ---
DROP POLICY IF EXISTS "Authenticated users can read knowledge" ON public.knowledge_base;
DROP POLICY IF EXISTS "Authenticated users can insert knowledge" ON public.knowledge_base;
DROP POLICY IF EXISTS "Authenticated users can update knowledge" ON public.knowledge_base;
DROP POLICY IF EXISTS "Authenticated users can delete knowledge" ON public.knowledge_base;

-- 読み取りのみ認証ユーザーに許可（AIチャット/プランで使用）
CREATE POLICY "Authenticated users can read knowledge" ON public.knowledge_base
  FOR SELECT USING (auth.role() = 'authenticated');

-- 書き込みはすべてブロック（管理操作は service_role 経由）
CREATE POLICY "Service role only: insert knowledge" ON public.knowledge_base
  FOR INSERT WITH CHECK (false);
CREATE POLICY "Service role only: update knowledge" ON public.knowledge_base
  FOR UPDATE USING (false);
CREATE POLICY "Service role only: delete knowledge" ON public.knowledge_base
  FOR DELETE USING (false);

-- --- knowledge_auto_runs ---
DROP POLICY IF EXISTS "Authenticated users can read runs" ON public.knowledge_auto_runs;
DROP POLICY IF EXISTS "Authenticated users can insert runs" ON public.knowledge_auto_runs;

-- 読み取りもブロック（管理画面は admin API で service_role 経由）
CREATE POLICY "Service role only: read runs" ON public.knowledge_auto_runs
  FOR SELECT USING (false);
CREATE POLICY "Service role only: insert runs" ON public.knowledge_auto_runs
  FOR INSERT WITH CHECK (false);

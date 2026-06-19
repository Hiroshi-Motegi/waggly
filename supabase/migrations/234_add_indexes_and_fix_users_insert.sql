-- ============================================================
-- 234: 欠損インデックス追加 + users INSERT ポリシー修正
-- ============================================================

-- practice_clubs.club_id — history/summary/clubs route でフルスキャン回避
CREATE INDEX IF NOT EXISTS practice_clubs_club_id_idx ON public.practice_clubs(club_id);

-- knowledge_base.status — AI chat/plan 毎リクエストで status='active' フィルタ
CREATE INDEX IF NOT EXISTS knowledge_base_status_idx ON public.knowledge_base(status);

-- users INSERT ポリシー: WITH CHECK(true) → WITH CHECK(false)
-- ユーザー作成は resolve-session で service_role 経由のみ
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (false);

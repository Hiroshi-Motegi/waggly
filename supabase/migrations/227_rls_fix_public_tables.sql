-- plans: 公開読み取りOK、書き込みはサービスロールのみ
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans are publicly readable"
  ON public.plans FOR SELECT
  USING (true);

-- account_deletion_reasons: 本人のみ INSERT、SELECT/UPDATE/DELETE 不可
ALTER TABLE public.account_deletion_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own deletion reason"
  ON public.account_deletion_reasons FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- auth redesign 後、auth.uid() != users.id なので user_providers 経由で検証する
-- NOTE: 現在 account/delete ルートは getAdminClient() (service_role) を使用しており
-- このポリシーはバイパスされる。クライアント直接アクセスの防御層として設定。
DROP POLICY IF EXISTS "Users can insert own deletion reason" ON public.account_deletion_reasons;

CREATE POLICY "Users can insert own deletion reason"
  ON public.account_deletion_reasons FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT up.user_id FROM user_providers up WHERE up.auth_user_id = auth.uid()
    )
  );

-- provider_email を復活（auth_user_id が null のリンクのみケースでメール取得不可のため）
ALTER TABLE user_providers ADD COLUMN provider_email TEXT;

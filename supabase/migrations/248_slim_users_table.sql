-- users テーブルのスリム化: display_name, avatar_url, google_email を削除
-- これらは profiles テーブルに一本化する
-- 既存ユーザーのうち profile がまだない場合に備え、先にマイグレーション

-- 1. profiles が存在しないユーザーに対して profile を作成（display_name, avatar_url を引き継ぐ）
INSERT INTO profiles (id, nickname, avatar_url, created_at, updated_at)
SELECT u.id, u.display_name, u.avatar_url, now(), now()
FROM users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 2. users テーブルから不要カラムを削除
ALTER TABLE users DROP COLUMN display_name;
ALTER TABLE users DROP COLUMN avatar_url;
ALTER TABLE users DROP COLUMN google_email;

-- 3. user_providers テーブルから provider_email を削除
ALTER TABLE user_providers DROP COLUMN provider_email;

-- 全データ削除（開発・テスト用）
-- users 削除で ON DELETE CASCADE により子テーブル全削除
-- (clubs, club_images, club_memos, maintenances, accessories,
--  practice_sessions, practice_clubs, practice_plans, practice_plan_items,
--  ai_chats, profiles, favorite_courses, user_providers,
--  subscriptions, coupon_redemptions, ai_usage_counters, ai_usage)

BEGIN;

DELETE FROM public.account_deletion_reasons;
DELETE FROM public.webhook_events;
DELETE FROM public.users;
DELETE FROM auth.users;

COMMIT;

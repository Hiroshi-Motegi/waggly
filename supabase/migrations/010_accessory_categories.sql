-- Expand accessory categories: add apparel, bag, rangefinder, grip, shaft
-- NOTE: accessories table is created (or recreated) in 100_auth_redesign.sql with these categories already included.
-- This migration is a no-op when the table doesn't exist yet (fresh install).
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'accessories') THEN
    ALTER TABLE public.accessories DROP CONSTRAINT IF EXISTS accessories_category_check;
    ALTER TABLE public.accessories ADD CONSTRAINT accessories_category_check
      CHECK (category IN ('ball', 'glove', 'tee', 'apparel', 'bag', 'rangefinder', 'grip', 'shaft', 'other'));
  END IF;
END $$;

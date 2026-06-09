-- Expand accessory categories: add apparel, bag, rangefinder, grip, shaft
ALTER TABLE public.accessories DROP CONSTRAINT IF EXISTS accessories_category_check;
ALTER TABLE public.accessories ADD CONSTRAINT accessories_category_check
  CHECK (category IN ('ball', 'glove', 'tee', 'apparel', 'bag', 'rangefinder', 'grip', 'shaft', 'other'));

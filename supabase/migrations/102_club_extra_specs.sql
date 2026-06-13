-- Add new club spec fields
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS grip_name text;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS grip_size text;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS bounce numeric;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS sole_shape text;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS face_angle numeric;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS shaft_weight numeric;

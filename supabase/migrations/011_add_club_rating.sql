-- Add rating field to clubs for consistency with accessories
ALTER TABLE public.clubs ADD COLUMN rating integer;

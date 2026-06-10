-- Add google_id to users for account linking
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS google_id text UNIQUE;

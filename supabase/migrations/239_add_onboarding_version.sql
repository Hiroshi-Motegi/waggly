-- Add onboarding_version to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS onboarding_version integer NOT NULL DEFAULT 0;

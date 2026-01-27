-- Add onboarding_completed column to profiles table
-- This is needed for the onboarding flow to track completion status

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Update existing profiles to mark them as completed (since they already exist)
UPDATE public.profiles SET onboarding_completed = true WHERE onboarding_completed IS NULL;

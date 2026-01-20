-- Add avatar_url column to profiles table for profile picture support
-- This migration adds support for user profile avatars

-- Add avatar_url column if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Comment for documentation
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to user profile avatar image stored in Supabase Storage';

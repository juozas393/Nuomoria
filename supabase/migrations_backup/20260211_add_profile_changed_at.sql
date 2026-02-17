-- Add profile_changed_at column to profiles table
-- Used to track when profile data was last modified

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_changed_at timestamptz;

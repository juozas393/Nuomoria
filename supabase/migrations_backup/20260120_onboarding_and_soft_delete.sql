-- Migration: Add onboarding_completed and soft delete columns
-- Date: 2026-01-20
-- Description: Adds onboarding tracking and soft delete support

-- Add onboarding_completed column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Add soft delete columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add soft delete column to profiles table  
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Update existing users to have onboarding_completed = true
-- (they already completed registration before this migration)
UPDATE profiles 
SET onboarding_completed = true 
WHERE onboarding_completed IS NULL OR onboarding_completed = false;

-- Create index for faster deleted user lookups
CREATE INDEX IF NOT EXISTS idx_users_is_deleted ON users(is_deleted) WHERE is_deleted = true;

-- Comment for documentation
COMMENT ON COLUMN profiles.onboarding_completed IS 'Whether user has completed the onboarding flow';
COMMENT ON COLUMN users.is_deleted IS 'Soft delete flag - user account is deactivated';
COMMENT ON COLUMN users.deleted_at IS 'Timestamp when the account was deleted/deactivated';

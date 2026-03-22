-- Add welcome_completed to profiles to track if the welcome onboarding flow is finished
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS welcome_completed boolean DEFAULT false;

-- ROLLBACK:
-- ALTER TABLE profiles DROP COLUMN IF EXISTS welcome_completed;

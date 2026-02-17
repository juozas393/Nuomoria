-- Migration: Fix users.role to allow NULL for onboarding
-- Applied to: Staging (isuqgyxrwvvniwvaljrc)
-- Reason: handle_new_user() inserts NULL role for Google-only auth
--          User picks role during onboarding flow

-- Allow NULL role in users table for onboarding flow
ALTER TABLE public.users ALTER COLUMN role DROP NOT NULL;
ALTER TABLE public.users ALTER COLUMN role DROP DEFAULT;

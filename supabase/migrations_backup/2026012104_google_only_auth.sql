-- Google-Only Auth Migration
-- Fix handle_new_user() trigger to use role=NULL instead of defaulting to 'landlord'
-- This ensures users MUST go through onboarding to select their role

-- 1. Update handle_new_user() trigger - set role to NULL for new users
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    user_first_name text;
    user_last_name text;
BEGIN
    -- Extract names from Google OAuth metadata
    user_first_name := COALESCE(
        NEW.raw_user_meta_data->>'given_name',
        NEW.raw_user_meta_data->>'first_name',
        'User'
    );
    
    user_last_name := COALESCE(
        NEW.raw_user_meta_data->>'family_name',
        NEW.raw_user_meta_data->>'last_name',
        'Name'
    );

    -- Insert into public.users with NULL role to enforce onboarding
    INSERT INTO public.users (
        id, 
        email, 
        first_name, 
        last_name, 
        role,  -- NULL = must complete onboarding
        status,
        google_linked,
        google_email,
        created_at, 
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        user_first_name,
        user_last_name,
        NULL,  -- Changed from 'landlord' to NULL
        'active',
        true,
        NEW.email,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        google_linked = true,
        google_email = EXCLUDED.google_email,
        -- DO NOT overwrite role if it already exists
        role = COALESCE(public.users.role, EXCLUDED.role),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$;

-- 2. Update ensure_user_row() to also preserve NULL role for onboarding
CREATE OR REPLACE FUNCTION public.ensure_user_row(
    p_role text DEFAULT NULL,  -- Changed default from 'tenant' to NULL
    p_first_name text DEFAULT 'User',
    p_last_name text DEFAULT 'Name'
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_existing_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RETURN; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  IF v_email IS NULL THEN RETURN; END IF;

  SELECT id INTO v_existing_id FROM public.users WHERE email = v_email OR id = v_user_id LIMIT 1;

  IF v_existing_id IS NULL THEN
    -- New user - create with NULL role to force onboarding
    INSERT INTO public.users (id, email, role, status, google_linked, google_email, first_name, last_name, created_at, updated_at)
    VALUES (v_user_id, v_email, p_role, 'active', true, v_email, 
            COALESCE(NULLIF(p_first_name, ''), 'User'), 
            COALESCE(NULLIF(p_last_name, ''), 'Name'), 
            now(), now())
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      -- Preserve existing role, don't overwrite
      role = COALESCE(public.users.role, EXCLUDED.role),
      google_linked = EXCLUDED.google_linked, 
      google_email = EXCLUDED.google_email,
      first_name = COALESCE(NULLIF(public.users.first_name, ''), EXCLUDED.first_name),
      last_name = COALESCE(NULLIF(public.users.last_name, ''), EXCLUDED.last_name), 
      updated_at = now();
  ELSE
    -- Existing user - NEVER overwrite non-null role
    UPDATE public.users SET
      role = COALESCE(role, p_role),  -- Only set if currently NULL
      google_linked = true, 
      google_email = COALESCE(google_email, v_email),
      first_name = COALESCE(NULLIF(first_name, ''), p_first_name, 'User'),
      last_name = COALESCE(NULLIF(last_name, ''), p_last_name, 'Name'), 
      updated_at = now()
    WHERE id = v_user_id OR email = v_email;
  END IF;
END; 
$$;

-- Add status column to users if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.users ADD COLUMN status text DEFAULT 'active';
    END IF;
END $$;

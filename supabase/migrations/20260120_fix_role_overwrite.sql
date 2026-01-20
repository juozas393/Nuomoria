-- Fix: Prevent ensure_user_row from overwriting existing role
-- The bug: When user already exists with a role, ensure_user_row was overwriting it
-- with the default p_role parameter (often 'tenant' or from stale localStorage)

BEGIN;

SET search_path TO public;

DROP FUNCTION IF EXISTS public.ensure_user_row(text, text, text);

CREATE OR REPLACE FUNCTION public.ensure_user_row(
  p_role text DEFAULT 'tenant',
  p_first_name text DEFAULT 'User',
  p_last_name text DEFAULT 'Name'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_existing_id uuid;
  v_existing_role text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'ensure_user_row: auth.uid() returned null';
    RETURN;
  END IF;

  SELECT email INTO v_email
  FROM auth.users
  WHERE id = v_user_id;

  IF v_email IS NULL THEN
    RAISE NOTICE 'ensure_user_row: auth user % has no email', v_user_id;
    RETURN;
  END IF;

  -- Check if user already exists and get their current role
  SELECT id, role INTO v_existing_id, v_existing_role
  FROM public.users
  WHERE email = v_email OR id = v_user_id
  LIMIT 1;

  IF v_existing_id IS NULL THEN
    -- NEW USER: Insert with the provided role
    INSERT INTO public.users (
      id,
      email,
      role,
      google_linked,
      google_email,
      first_name,
      last_name,
      created_at,
      updated_at
    )
    VALUES (
      v_user_id,
      v_email,
      COALESCE(p_role, 'tenant'),
      true,
      v_email,
      COALESCE(NULLIF(p_first_name, ''), 'User'),
      COALESCE(NULLIF(p_last_name, ''), 'Name'),
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      -- CRITICAL: Preserve existing role, don't overwrite!
      role = COALESCE(public.users.role, EXCLUDED.role),
      google_linked = EXCLUDED.google_linked,
      google_email = EXCLUDED.google_email,
      first_name = COALESCE(NULLIF(public.users.first_name, ''), EXCLUDED.first_name),
      last_name = COALESCE(NULLIF(public.users.last_name, ''), EXCLUDED.last_name),
      updated_at = now();
      
  ELSIF v_existing_id <> v_user_id THEN
    -- EXISTING USER WITH DIFFERENT AUTH ID (email match but ID mismatch)
    -- Update ID but PRESERVE the existing role
    UPDATE public.users
    SET
      id = v_user_id,
      -- CRITICAL: Keep existing role, only use p_role if current role is null
      role = COALESCE(role, p_role, 'tenant'),
      google_linked = true,
      google_email = COALESCE(google_email, v_email),
      first_name = COALESCE(NULLIF(first_name, ''), p_first_name, 'User'),
      last_name = COALESCE(NULLIF(last_name, ''), p_last_name, 'Name'),
      updated_at = now()
    WHERE email = v_email;
    
  ELSE
    -- EXISTING USER WITH SAME ID: Only update non-role fields
    -- CRITICAL: NEVER overwrite role for existing users
    UPDATE public.users
    SET
      -- role stays unchanged! Only update if null
      role = COALESCE(role, p_role, 'tenant'),
      google_linked = true,
      google_email = COALESCE(google_email, v_email),
      first_name = COALESCE(NULLIF(first_name, ''), p_first_name, 'User'),
      last_name = COALESCE(NULLIF(last_name, ''), p_last_name, 'Name'),
      updated_at = now()
    WHERE id = v_user_id;
  END IF;
END;
$$;

COMMIT;

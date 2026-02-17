-- Migration: Fix check_username_available function parameter name
-- Applied to: Staging (isuqgyxrwvvniwvaljrc) 
-- Reason: PostgREST requires exact parameter name match
--   Staging had check_username_available(check_username text) 
--   App calls with p_username → PGRST202 error

DROP FUNCTION IF EXISTS public.check_username_available(text);

CREATE OR REPLACE FUNCTION public.check_username_available(p_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN public.is_username_available(p_username);
END;
$$;

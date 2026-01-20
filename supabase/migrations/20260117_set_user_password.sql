-- =====================================================
-- Set password for OAuth users
-- This function allows Google OAuth users to set a password
-- for username+password login
-- =====================================================

-- Function to set password for the current user
-- Uses SECURITY DEFINER to run with elevated privileges
CREATE OR REPLACE FUNCTION public.set_user_password(new_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Get the current user's ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Validate password length
  IF length(new_password) < 8 THEN
    RETURN json_build_object('success', false, 'error', 'Password must be at least 8 characters');
  END IF;

  -- Update the user's encrypted password in auth.users
  -- This uses the internal Supabase password hashing
  UPDATE auth.users
  SET 
    encrypted_password = crypt(new_password, gen_salt('bf')),
    updated_at = now()
  WHERE id = current_user_id;

  -- Update has_password flag in profiles
  UPDATE public.profiles
  SET has_password = true, updated_at = now()
  WHERE id = current_user_id;

  RETURN json_build_object('success', true, 'message', 'Password set successfully');
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.set_user_password(text) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.set_user_password(text) IS 'Allows authenticated users (including OAuth users) to set a password for username+password login.';

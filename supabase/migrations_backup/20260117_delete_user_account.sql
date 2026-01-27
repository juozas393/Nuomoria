-- Delete user account RPC function
-- This function deletes a user's profile and auth account
-- Must be executed with service role privileges

-- Create a function that deletes user data and auth account
CREATE OR REPLACE FUNCTION public.delete_user_account(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  -- Verify the user is deleting their own account
  IF auth.uid() != target_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: can only delete your own account');
  END IF;

  -- Delete from profiles table
  DELETE FROM public.profiles WHERE id = target_user_id;
  
  -- Delete from users table
  DELETE FROM public.users WHERE id = target_user_id;
  
  -- Delete addresses created by this user
  DELETE FROM public.addresses WHERE created_by = target_user_id;
  
  -- Delete the auth user (requires service role)
  -- This is called with SECURITY DEFINER so it runs with elevated privileges
  DELETE FROM auth.users WHERE id = target_user_id;
  
  RETURN json_build_object('success', true, 'message', 'Account deleted successfully');
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.delete_user_account(uuid) IS 'Safely deletes a user account and all associated data. User can only delete their own account.';

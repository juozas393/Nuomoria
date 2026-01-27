-- Dual Auth System Migration
-- Google OAuth (primary) + Username/Password (secondary)

-- ============================================
-- 1. PROFILES TABLE (if not exists)
-- ============================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  username text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('landlord', 'tenant')),
  has_password boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create unique index on username (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx 
  ON public.profiles (LOWER(username));

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS profiles_email_idx 
  ON public.profiles (email);

-- ============================================
-- 2. RLS POLICIES
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public username lookup for login" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can insert their own profile (during onboarding)
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================
-- 3. SECURE RPC FOR USERNAME LOGIN
-- ============================================

-- Function to lookup user by username for login
-- Returns only necessary fields: email, has_password, user_id
-- Does NOT expose other sensitive data
CREATE OR REPLACE FUNCTION public.get_login_info_by_username(lookup_username text)
RETURNS TABLE (
  user_id uuid,
  email text,
  has_password boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return user info for username/password login
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.email,
    p.has_password
  FROM public.profiles p
  WHERE LOWER(p.username) = LOWER(lookup_username)
  LIMIT 1;
END;
$$;

-- Grant execute to authenticated and anon users (needed for login)
GRANT EXECUTE ON FUNCTION public.get_login_info_by_username(text) TO authenticated, anon;

-- ============================================
-- 4. FUNCTION TO CHECK USERNAME AVAILABILITY
-- ============================================

CREATE OR REPLACE FUNCTION public.check_username_available(check_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  username_exists boolean;
BEGIN
  -- Validate format first
  IF check_username !~ '^[a-z0-9._-]{3,20}$' THEN
    RETURN false;
  END IF;
  
  -- Check if username already exists (case-insensitive)
  SELECT EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE LOWER(username) = LOWER(check_username)
  ) INTO username_exists;
  
  RETURN NOT username_exists;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_username_available(text) TO authenticated, anon;

-- ============================================
-- 5. TRIGGER TO UPDATE updated_at
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 6. HELPER COMMENTS
-- ============================================

COMMENT ON TABLE public.profiles IS 'User profiles with dual auth support (Google OAuth + Username/Password)';
COMMENT ON COLUMN public.profiles.has_password IS 'True if user has set a password for username/password login';
COMMENT ON FUNCTION public.get_login_info_by_username(text) IS 'Secure lookup for username/password login - returns only email and has_password flag';
COMMENT ON FUNCTION public.check_username_available(text) IS 'Check if username is available (validates format and uniqueness)';

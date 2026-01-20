-- =====================================================
-- NUOMORIA DATABASE SETUP - COPY & PASTE THIS ENTIRE FILE
-- Run this in: Supabase Dashboard -> SQL Editor -> New Query
-- =====================================================

-- =====================================================
-- 1. PROFILES TABLE (dual auth: Google + Username/Password)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  username text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('landlord', 'tenant')),
  has_password boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx ON public.profiles (LOWER(username));
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles (email);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public can lookup username for auth" ON public.profiles;

-- RLS Policies
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Public can lookup username for auth"
  ON public.profiles FOR SELECT
  USING (true);

-- =====================================================
-- 2. RPC FUNCTIONS
-- =====================================================

-- Function: Get user by username (for login)
CREATE OR REPLACE FUNCTION public.get_user_by_username(p_username text)
RETURNS TABLE (
  user_id uuid,
  email text,
  has_password boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.has_password
  FROM public.profiles p
  WHERE LOWER(p.username) = LOWER(p_username);
END;
$$;

-- Function: Check username availability
CREATE OR REPLACE FUNCTION public.is_username_available(p_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE LOWER(username) = LOWER(p_username)
  );
END;
$$;

-- Alias for frontend compatibility
CREATE OR REPLACE FUNCTION public.check_username_available(p_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN public.is_username_available(p_username);
END;
$$;

-- =====================================================
-- 3. TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 4. PERMISSIONS
-- =====================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_by_username(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_username_available(text) TO anon, authenticated;

-- =====================================================
-- DONE! Your database is ready.
-- Now you can use Google OAuth + Username/Password login.
-- =====================================================

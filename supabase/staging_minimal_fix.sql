-- ===========================================
-- MINIMAL FIX FOR CORE TABLES
-- Run this FIRST to fix 403 errors
-- ===========================================

-- 1. Enable RLS on core tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- 2. Grant table access to authenticated role
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.user_addresses TO authenticated;
GRANT ALL ON public.addresses TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- 3. Drop existing policies on core tables (to avoid duplicates)
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_delete_own" ON public.users;
DROP POLICY IF EXISTS "users_select_optimized" ON public.users;
DROP POLICY IF EXISTS "users_insert_optimized" ON public.users;
DROP POLICY IF EXISTS "users_update_optimized" ON public.users;
DROP POLICY IF EXISTS "Users can delete own user" ON public.users;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public can lookup username for auth" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

DROP POLICY IF EXISTS "user_addresses_select_own" ON public.user_addresses;
DROP POLICY IF EXISTS "user_addresses_insert_own" ON public.user_addresses;
DROP POLICY IF EXISTS "user_addresses_update_own" ON public.user_addresses;
DROP POLICY IF EXISTS "user_addresses_delete_own" ON public.user_addresses;
DROP POLICY IF EXISTS "user_addresses_select_optimized" ON public.user_addresses;
DROP POLICY IF EXISTS "user_addresses_insert_optimized" ON public.user_addresses;
DROP POLICY IF EXISTS "user_addresses_update_optimized" ON public.user_addresses;
DROP POLICY IF EXISTS "user_addresses_delete_optimized" ON public.user_addresses;

DROP POLICY IF EXISTS "addresses_select_linked" ON public.addresses;
DROP POLICY IF EXISTS "addresses_insert_auth" ON public.addresses;
DROP POLICY IF EXISTS "addresses_update_linked" ON public.addresses;
DROP POLICY IF EXISTS "addresses_delete_linked" ON public.addresses;
DROP POLICY IF EXISTS "addresses_select_optimized" ON public.addresses;
DROP POLICY IF EXISTS "addresses_insert_optimized" ON public.addresses;
DROP POLICY IF EXISTS "addresses_update_optimized" ON public.addresses;
DROP POLICY IF EXISTS "addresses_delete_optimized" ON public.addresses;

-- 4. Create simple policies for USERS
CREATE POLICY "users_select_own" ON public.users 
  FOR SELECT USING (id = auth.uid());
CREATE POLICY "users_insert_own" ON public.users 
  FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "users_update_own" ON public.users 
  FOR UPDATE USING (id = auth.uid());
CREATE POLICY "users_delete_own" ON public.users 
  FOR DELETE USING (id = auth.uid());

-- 5. Create simple policies for PROFILES
CREATE POLICY "profiles_select_public" ON public.profiles 
  FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles 
  FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles 
  FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_delete_own" ON public.profiles 
  FOR DELETE USING (id = auth.uid());

-- 6. Create simple policies for USER_ADDRESSES
CREATE POLICY "user_addresses_select_own" ON public.user_addresses 
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "user_addresses_insert_own" ON public.user_addresses 
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_addresses_update_own" ON public.user_addresses 
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "user_addresses_delete_own" ON public.user_addresses 
  FOR DELETE USING (user_id = auth.uid());

-- 7. Create simple policies for ADDRESSES
CREATE POLICY "addresses_select_linked" ON public.addresses 
  FOR SELECT USING (
    created_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM user_addresses ua WHERE ua.address_id = id AND ua.user_id = auth.uid())
  );
CREATE POLICY "addresses_insert_auth" ON public.addresses 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "addresses_update_linked" ON public.addresses 
  FOR UPDATE USING (
    created_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM user_addresses ua WHERE ua.address_id = id AND ua.user_id = auth.uid())
  );
CREATE POLICY "addresses_delete_linked" ON public.addresses 
  FOR DELETE USING (created_by = auth.uid());

-- 8. Verify
SELECT 'Core tables fixed! Now test login.' as status;

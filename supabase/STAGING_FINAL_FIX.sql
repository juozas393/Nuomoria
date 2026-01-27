-- =====================================================
-- GALUTINIS STAGING FIX - VISKAS VIENAME
-- Įvykdyk šį SQL Supabase Staging SQL Editoriuje
-- =====================================================

-- 1. USER_PERMISSIONS - kritiškai svarbu!
ALTER TABLE IF EXISTS public.user_permissions ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.user_permissions TO authenticated;
GRANT SELECT ON public.user_permissions TO anon;

DROP POLICY IF EXISTS "user_permissions_select_own" ON public.user_permissions;
DROP POLICY IF EXISTS "user_permissions_manage" ON public.user_permissions;
DROP POLICY IF EXISTS "user_permissions_select" ON public.user_permissions;

CREATE POLICY "user_permissions_select_own" ON public.user_permissions 
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_permissions_manage" ON public.user_permissions 
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 2. PROFILES - reikalingas onboarding
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;

CREATE POLICY "profiles_select_public" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (id = auth.uid());

-- 3. USERS - kritiškai svarbu auth
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.users TO authenticated;

DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_delete_own" ON public.users;
DROP POLICY IF EXISTS "users_select_optimized" ON public.users;
DROP POLICY IF EXISTS "users_insert_optimized" ON public.users;
DROP POLICY IF EXISTS "users_update_optimized" ON public.users;

CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (id = auth.uid());
CREATE POLICY "users_insert_own" ON public.users FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (id = auth.uid());
CREATE POLICY "users_delete_own" ON public.users FOR DELETE USING (id = auth.uid());

-- 4. USER_ADDRESSES
ALTER TABLE IF EXISTS public.user_addresses ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.user_addresses TO authenticated;

DROP POLICY IF EXISTS "user_addresses_select_own" ON public.user_addresses;
DROP POLICY IF EXISTS "user_addresses_insert_own" ON public.user_addresses;
DROP POLICY IF EXISTS "user_addresses_update_own" ON public.user_addresses;
DROP POLICY IF EXISTS "user_addresses_delete_own" ON public.user_addresses;

CREATE POLICY "user_addresses_select_own" ON public.user_addresses FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "user_addresses_insert_own" ON public.user_addresses FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_addresses_update_own" ON public.user_addresses FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "user_addresses_delete_own" ON public.user_addresses FOR DELETE USING (user_id = auth.uid());

-- 5. ADDRESSES
ALTER TABLE IF EXISTS public.addresses ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.addresses TO authenticated;

DROP POLICY IF EXISTS "addresses_select_linked" ON public.addresses;
DROP POLICY IF EXISTS "addresses_insert_auth" ON public.addresses;
DROP POLICY IF EXISTS "addresses_update_linked" ON public.addresses;
DROP POLICY IF EXISTS "addresses_delete_linked" ON public.addresses;

CREATE POLICY "addresses_select_linked" ON public.addresses FOR SELECT USING (
  created_by = auth.uid() OR 
  EXISTS (SELECT 1 FROM user_addresses ua WHERE ua.address_id = id AND ua.user_id = auth.uid())
);
CREATE POLICY "addresses_insert_auth" ON public.addresses FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "addresses_update_linked" ON public.addresses FOR UPDATE USING (
  created_by = auth.uid() OR 
  EXISTS (SELECT 1 FROM user_addresses ua WHERE ua.address_id = id AND ua.user_id = auth.uid())
);
CREATE POLICY "addresses_delete_linked" ON public.addresses FOR DELETE USING (created_by = auth.uid());

-- 6. TENANT_INVITATIONS
ALTER TABLE IF EXISTS public.tenant_invitations ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.tenant_invitations TO authenticated;

DROP POLICY IF EXISTS "tenant_invitations_select" ON public.tenant_invitations;
DROP POLICY IF EXISTS "tenant_invitations_insert" ON public.tenant_invitations;
DROP POLICY IF EXISTS "tenant_invitations_update" ON public.tenant_invitations;
DROP POLICY IF EXISTS "tenant_invitations_delete" ON public.tenant_invitations;

CREATE POLICY "tenant_invitations_select" ON public.tenant_invitations FOR SELECT USING (
  lower(email) = lower(COALESCE(auth.jwt() ->> 'email', '')) OR invited_by = auth.uid()
);
CREATE POLICY "tenant_invitations_insert" ON public.tenant_invitations FOR INSERT WITH CHECK (invited_by = auth.uid());
CREATE POLICY "tenant_invitations_update" ON public.tenant_invitations FOR UPDATE USING (
  (status = 'pending' AND lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))) OR invited_by = auth.uid()
);
CREATE POLICY "tenant_invitations_delete" ON public.tenant_invitations FOR DELETE USING (invited_by = auth.uid());

-- 7. PROPERTIES
ALTER TABLE IF EXISTS public.properties ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.properties TO authenticated;

DROP POLICY IF EXISTS "properties_select" ON public.properties;
DROP POLICY IF EXISTS "properties_select_linked" ON public.properties;

CREATE POLICY "properties_select" ON public.properties FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_addresses ua JOIN addresses a ON a.id = ua.address_id WHERE a.id = properties.address_id AND ua.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM tenant_invitations ti WHERE ti.property_id = properties.id AND ti.status = 'accepted' AND lower(ti.email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
);

-- 8. INVOICES
ALTER TABLE IF EXISTS public.invoices ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.invoices TO authenticated;

DROP POLICY IF EXISTS "invoices_select" ON public.invoices;

CREATE POLICY "invoices_select" ON public.invoices FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_addresses ua JOIN addresses a ON a.id = ua.address_id JOIN properties p ON p.address_id = a.id WHERE p.id = invoices.property_id AND ua.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM tenant_invitations ti WHERE ti.property_id = invoices.property_id AND ti.status = 'accepted' AND lower(ti.email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
);

-- 9. ensure_user_row funkcija
CREATE OR REPLACE FUNCTION public.ensure_user_row(
    p_role TEXT DEFAULT NULL,
    p_first_name TEXT DEFAULT 'User',
    p_last_name TEXT DEFAULT 'Name'
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID;
    v_email TEXT;
    v_existing_role TEXT;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
    SELECT role INTO v_existing_role FROM public.users WHERE id = v_uid;

    IF v_existing_role IS NOT NULL THEN
        UPDATE public.users SET email = v_email, updated_at = NOW() WHERE id = v_uid;
    ELSE
        INSERT INTO public.users (id, email, role, first_name, last_name, is_active, created_at, updated_at)
        VALUES (v_uid, v_email, COALESCE(p_role, 'tenant'), COALESCE(p_first_name, 'User'), COALESCE(p_last_name, 'Name'), true, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = NOW();
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_user_row(TEXT, TEXT, TEXT) TO authenticated;

-- Patvirtinimas
SELECT 'STAGING DATABASE FULLY FIXED!' as status;

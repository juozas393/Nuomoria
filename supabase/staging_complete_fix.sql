-- =============================================
-- STAGING DATABASE FIX - COMPLETE RESET
-- Run this in Supabase SQL Editor for STAGING project
-- =============================================

-- STEP 1: Enable RLS on all tables
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.address_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.apartment_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.meter_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.property_meter_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tenant_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.password_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.communal_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.communal_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.address_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_meter_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_hidden_meter_templates ENABLE ROW LEVEL SECURITY;

-- STEP 2: Grant table permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_addresses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.address_meters TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apartment_meters TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meter_readings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_meter_configs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.password_resets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.communal_meters TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.communal_expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.address_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_meter_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_hidden_meter_templates TO authenticated;

-- Grant SELECT to anon for some tables
GRANT SELECT ON public.profiles TO anon;

-- STEP 3: Drop all existing policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- =============================================
-- STEP 4: HELPER FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION has_access_to_property(p_property_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM user_addresses ua
        JOIN addresses a ON a.id = ua.address_id
        JOIN properties p ON p.address_id = a.id
        WHERE p.id = p_property_id
        AND ua.user_id = auth.uid()
    );
END;
$$;

CREATE OR REPLACE FUNCTION has_access_to_address(p_address_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM user_addresses ua
        WHERE ua.address_id = p_address_id
        AND ua.user_id = auth.uid()
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_username_available(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE username = p_username
  );
END;
$$;

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
        UPDATE public.users
        SET 
            email = v_email,
            first_name = COALESCE(p_first_name, first_name, 'User'),
            last_name = COALESCE(p_last_name, last_name, 'Name'),
            updated_at = NOW()
        WHERE id = v_uid;
    ELSE
        INSERT INTO public.users (id, email, role, first_name, last_name, is_active, created_at, updated_at)
        VALUES (
            v_uid,
            v_email,
            COALESCE(p_role, 'tenant'),
            COALESCE(p_first_name, 'User'),
            COALESCE(p_last_name, 'Name'),
            true,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            first_name = COALESCE(EXCLUDED.first_name, public.users.first_name),
            last_name = COALESCE(EXCLUDED.last_name, public.users.last_name),
            updated_at = NOW();
    END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION has_access_to_property(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_access_to_address(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_username_available(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_username_available(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.ensure_user_row(TEXT, TEXT, TEXT) TO authenticated;

-- =============================================
-- STEP 5: RLS POLICIES
-- =============================================

-- USERS (critical - must be simple, no circular dependencies)
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (id = auth.uid());
CREATE POLICY "users_insert_own" ON public.users FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "users_delete_own" ON public.users FOR DELETE USING (id = auth.uid());

-- PROFILES (critical - must be simple)
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_select_public" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (id = auth.uid());

-- USER_ADDRESSES (simplified - no circular dependency on users)
CREATE POLICY "user_addresses_select_own" ON public.user_addresses FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "user_addresses_insert_own" ON public.user_addresses FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_addresses_update_own" ON public.user_addresses FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_addresses_delete_own" ON public.user_addresses FOR DELETE USING (user_id = auth.uid());

-- ADDRESSES
CREATE POLICY "addresses_select_linked" ON public.addresses FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_addresses ua WHERE ua.address_id = addresses.id AND ua.user_id = auth.uid())
    OR created_by = auth.uid()
);
CREATE POLICY "addresses_insert_auth" ON public.addresses FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "addresses_update_linked" ON public.addresses FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_addresses ua WHERE ua.address_id = addresses.id AND ua.user_id = auth.uid())
    OR created_by = auth.uid()
);
CREATE POLICY "addresses_delete_linked" ON public.addresses FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_addresses ua WHERE ua.address_id = addresses.id AND ua.user_id = auth.uid() AND ua.role = 'landlord')
    OR created_by = auth.uid()
);

-- PROPERTIES
CREATE POLICY "properties_select_linked" ON public.properties FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_addresses ua JOIN addresses a ON a.id = ua.address_id WHERE a.id = properties.address_id AND ua.user_id = auth.uid())
);
CREATE POLICY "properties_manage_linked" ON public.properties FOR ALL USING (
    EXISTS (SELECT 1 FROM user_addresses ua JOIN addresses a ON a.id = ua.address_id WHERE a.id = properties.address_id AND ua.user_id = auth.uid() AND ua.role IN ('owner', 'manager', 'landlord'))
) WITH CHECK (
    EXISTS (SELECT 1 FROM user_addresses ua JOIN addresses a ON a.id = ua.address_id WHERE a.id = properties.address_id AND ua.user_id = auth.uid() AND ua.role IN ('owner', 'manager', 'landlord'))
);

-- CONVERSATIONS
CREATE POLICY "conversations_select_participant" ON public.conversations FOR SELECT USING (auth.uid() = participant_1 OR auth.uid() = participant_2);
CREATE POLICY "conversations_insert_participant" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- MESSAGES
CREATE POLICY "messages_select_conversation" ON public.messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid()))
);
CREATE POLICY "messages_insert_conversation" ON public.messages FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid()))
);
CREATE POLICY "messages_update_read" ON public.messages FOR UPDATE USING (
    EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid()))
) WITH CHECK (is_read = true);

-- ADDRESS_METERS
CREATE POLICY "address_meters_select" ON public.address_meters FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_addresses ua WHERE ua.address_id = address_meters.address_id AND ua.user_id = auth.uid())
);
CREATE POLICY "address_meters_manage" ON public.address_meters FOR ALL USING (
    EXISTS (SELECT 1 FROM user_addresses ua WHERE ua.address_id = address_meters.address_id AND ua.user_id = auth.uid() AND ua.role IN ('owner', 'manager', 'landlord'))
) WITH CHECK (
    EXISTS (SELECT 1 FROM user_addresses ua WHERE ua.address_id = address_meters.address_id AND ua.user_id = auth.uid() AND ua.role IN ('owner', 'manager', 'landlord'))
);

-- APARTMENT_METERS
CREATE POLICY "apartment_meters_select" ON public.apartment_meters FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_addresses ua JOIN addresses a ON a.id = ua.address_id JOIN properties p ON p.address_id = a.id WHERE p.id = apartment_meters.property_id AND ua.user_id = auth.uid())
);
CREATE POLICY "apartment_meters_manage" ON public.apartment_meters FOR ALL USING (
    EXISTS (SELECT 1 FROM user_addresses ua JOIN addresses a ON a.id = ua.address_id JOIN properties p ON p.address_id = a.id WHERE p.id = apartment_meters.property_id AND ua.user_id = auth.uid() AND ua.role IN ('owner', 'manager', 'landlord'))
) WITH CHECK (
    EXISTS (SELECT 1 FROM user_addresses ua JOIN addresses a ON a.id = ua.address_id JOIN properties p ON p.address_id = a.id WHERE p.id = apartment_meters.property_id AND ua.user_id = auth.uid() AND ua.role IN ('owner', 'manager', 'landlord'))
);

-- METER_READINGS
CREATE POLICY "meter_readings_read" ON public.meter_readings FOR SELECT USING (has_access_to_property(property_id));
CREATE POLICY "meter_readings_write" ON public.meter_readings FOR INSERT WITH CHECK (has_access_to_property(property_id));
CREATE POLICY "meter_readings_update" ON public.meter_readings FOR UPDATE USING (has_access_to_property(property_id)) WITH CHECK (has_access_to_property(property_id));

-- INVOICES
CREATE POLICY "invoices_select" ON public.invoices FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_addresses ua JOIN addresses a ON a.id = ua.address_id JOIN properties p ON p.address_id = a.id WHERE p.id = invoices.property_id AND ua.user_id = auth.uid())
);
CREATE POLICY "invoices_manage" ON public.invoices FOR ALL USING (
    EXISTS (SELECT 1 FROM user_addresses ua JOIN addresses a ON a.id = ua.address_id JOIN properties p ON p.address_id = a.id WHERE p.id = invoices.property_id AND ua.user_id = auth.uid() AND ua.role IN ('owner', 'manager', 'landlord'))
) WITH CHECK (
    EXISTS (SELECT 1 FROM user_addresses ua JOIN addresses a ON a.id = ua.address_id JOIN properties p ON p.address_id = a.id WHERE p.id = invoices.property_id AND ua.user_id = auth.uid() AND ua.role IN ('owner', 'manager', 'landlord'))
);

-- PROPERTY_METER_CONFIGS
CREATE POLICY "property_meter_configs_select" ON public.property_meter_configs FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_addresses ua JOIN addresses a ON a.id = ua.address_id WHERE a.id = property_meter_configs.address_id AND ua.user_id = auth.uid())
);
CREATE POLICY "property_meter_configs_manage" ON public.property_meter_configs FOR ALL USING (
    EXISTS (SELECT 1 FROM user_addresses ua JOIN addresses a ON a.id = ua.address_id WHERE a.id = property_meter_configs.address_id AND ua.user_id = auth.uid() AND ua.role IN ('owner', 'manager', 'landlord'))
) WITH CHECK (
    EXISTS (SELECT 1 FROM user_addresses ua JOIN addresses a ON a.id = ua.address_id WHERE a.id = property_meter_configs.address_id AND ua.user_id = auth.uid() AND ua.role IN ('owner', 'manager', 'landlord'))
);

-- TENANT_INVITATIONS
CREATE POLICY "tenant_invitations_select" ON public.tenant_invitations FOR SELECT USING (
    lower(email) = lower(COALESCE(auth.jwt() ->> 'email', '')) OR invited_by = auth.uid()
);
CREATE POLICY "tenant_invitations_insert" ON public.tenant_invitations FOR INSERT WITH CHECK (invited_by = auth.uid());
CREATE POLICY "tenant_invitations_update" ON public.tenant_invitations FOR UPDATE USING (
    (status = 'pending' AND lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))) OR invited_by = auth.uid()
) WITH CHECK (
    lower(email) = lower(COALESCE(auth.jwt() ->> 'email', '')) OR invited_by = auth.uid()
);
CREATE POLICY "tenant_invitations_delete" ON public.tenant_invitations FOR DELETE USING (invited_by = auth.uid());

-- TENANTS
CREATE POLICY "tenants_read" ON public.tenants FOR SELECT USING (has_access_to_property(property_id));
CREATE POLICY "tenants_write" ON public.tenants FOR INSERT WITH CHECK (has_access_to_property(property_id));
CREATE POLICY "tenants_update" ON public.tenants FOR UPDATE USING (has_access_to_property(property_id)) WITH CHECK (has_access_to_property(property_id));

-- NOTIFICATIONS
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notifications_insert_auth" ON public.notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- PASSWORD_RESETS
CREATE POLICY "password_resets_manage_own" ON public.password_resets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- COMMUNAL_METERS
CREATE POLICY "communal_meters_select" ON public.communal_meters FOR SELECT USING (
    EXISTS (SELECT 1 FROM addresses a WHERE a.id = communal_meters.address_id AND a.created_by = auth.uid())
);
CREATE POLICY "communal_meters_manage" ON public.communal_meters FOR ALL USING (
    EXISTS (SELECT 1 FROM addresses a WHERE a.id = communal_meters.address_id AND a.created_by = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM addresses a WHERE a.id = communal_meters.address_id AND a.created_by = auth.uid())
);

-- COMMUNAL_EXPENSES
CREATE POLICY "communal_expenses_read" ON public.communal_expenses FOR SELECT USING (has_access_to_address(address_id));

-- ADDRESS_SETTINGS
CREATE POLICY "address_settings_read" ON public.address_settings FOR SELECT USING (has_access_to_address(address_id));
CREATE POLICY "address_settings_insert" ON public.address_settings FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_addresses ua WHERE ua.address_id = address_settings.address_id AND ua.user_id = auth.uid())
);
CREATE POLICY "address_settings_update" ON public.address_settings FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_addresses ua WHERE ua.address_id = address_settings.address_id AND ua.user_id = auth.uid())
);

-- USER_METER_TEMPLATES
CREATE POLICY "user_meter_templates_manage" ON public.user_meter_templates FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- USER_HIDDEN_METER_TEMPLATES
CREATE POLICY "user_hidden_meter_templates_manage" ON public.user_hidden_meter_templates FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =============================================
-- SUCCESS!
-- =============================================
SELECT 'All RLS policies and permissions applied successfully!' as status;

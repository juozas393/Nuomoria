-- =============================================
-- PRODUCTION RLS POLICIES FOR STAGING
-- Copy from production Supabase
-- =============================================

-- First, drop all existing policies to avoid conflicts
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
-- REQUIRED HELPER FUNCTIONS
-- =============================================

-- has_access_to_property function
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

-- has_access_to_address function
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

-- check_username_available function
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

-- ensure_user_row function
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
-- PRODUCTION RLS POLICIES
-- =============================================

-- CONVERSATIONS
CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT USING (((auth.uid() = participant_1) OR (auth.uid() = participant_2)));
CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT WITH CHECK (((auth.uid() = participant_1) OR (auth.uid() = participant_2)));

-- MESSAGES
CREATE POLICY "Users can view messages in their conversations" ON public.messages FOR SELECT USING ((EXISTS ( SELECT 1 FROM conversations c WHERE ((c.id = messages.conversation_id) AND ((c.participant_1 = auth.uid()) OR (c.participant_2 = auth.uid()))))));
CREATE POLICY "Users can send messages in their conversations" ON public.messages FOR INSERT WITH CHECK (((sender_id = auth.uid()) AND (EXISTS ( SELECT 1 FROM conversations c WHERE ((c.id = messages.conversation_id) AND ((c.participant_1 = auth.uid()) OR (c.participant_2 = auth.uid())))))));
CREATE POLICY "Users can mark messages as read" ON public.messages FOR UPDATE USING ((EXISTS ( SELECT 1 FROM conversations c WHERE ((c.id = messages.conversation_id) AND ((c.participant_1 = auth.uid()) OR (c.participant_2 = auth.uid())))))) WITH CHECK ((is_read = true));

-- ADDRESS_METERS
CREATE POLICY "address_meters_select_optimized" ON public.address_meters FOR SELECT USING ((EXISTS ( SELECT 1 FROM user_addresses ua WHERE ((ua.address_id = address_meters.address_id) AND (ua.user_id = auth.uid())))));
CREATE POLICY "address_meters_manage_optimized" ON public.address_meters FOR ALL USING ((EXISTS ( SELECT 1 FROM user_addresses ua WHERE ((ua.address_id = address_meters.address_id) AND (ua.user_id = auth.uid()) AND ((ua.role)::text = ANY (ARRAY['owner', 'manager', 'landlord'])))))) WITH CHECK ((EXISTS ( SELECT 1 FROM user_addresses ua WHERE ((ua.address_id = address_meters.address_id) AND (ua.user_id = auth.uid()) AND ((ua.role)::text = ANY (ARRAY['owner', 'manager', 'landlord']))))));

-- APARTMENT_METERS
CREATE POLICY "apartment_meters_select_optimized" ON public.apartment_meters FOR SELECT USING ((EXISTS ( SELECT 1 FROM user_addresses ua JOIN addresses a ON a.id = ua.address_id JOIN properties p ON p.address_id = a.id WHERE ((p.id = apartment_meters.property_id) AND (ua.user_id = auth.uid())))));
CREATE POLICY "apartment_meters_manage_optimized" ON public.apartment_meters FOR ALL USING ((EXISTS ( SELECT 1 FROM user_addresses ua JOIN addresses a ON a.id = ua.address_id JOIN properties p ON p.address_id = a.id WHERE ((p.id = apartment_meters.property_id) AND (ua.user_id = auth.uid()) AND ((ua.role)::text = ANY (ARRAY['owner', 'manager', 'landlord'])))))) WITH CHECK ((EXISTS ( SELECT 1 FROM user_addresses ua JOIN addresses a ON a.id = ua.address_id JOIN properties p ON p.address_id = a.id WHERE ((p.id = apartment_meters.property_id) AND (ua.user_id = auth.uid()) AND ((ua.role)::text = ANY (ARRAY['owner', 'manager', 'landlord']))))));

-- METER_READINGS
CREATE POLICY "meter_readings_read" ON public.meter_readings FOR SELECT USING (has_access_to_property(property_id));
CREATE POLICY "meter_readings_write" ON public.meter_readings FOR INSERT WITH CHECK (has_access_to_property(property_id));
CREATE POLICY "meter_readings_update" ON public.meter_readings FOR UPDATE USING (has_access_to_property(property_id)) WITH CHECK (has_access_to_property(property_id));

-- INVOICES
CREATE POLICY "invoices_select_optimized" ON public.invoices FOR SELECT USING ((EXISTS ( SELECT 1 FROM user_addresses ua JOIN addresses a ON a.id = ua.address_id JOIN properties p ON p.address_id = a.id WHERE ((p.id = invoices.property_id) AND (ua.user_id = auth.uid())))));
CREATE POLICY "invoices_manage_optimized" ON public.invoices FOR ALL USING ((EXISTS ( SELECT 1 FROM user_addresses ua JOIN addresses a ON a.id = ua.address_id JOIN properties p ON p.address_id = a.id WHERE ((p.id = invoices.property_id) AND (ua.user_id = auth.uid()) AND ((ua.role)::text = ANY (ARRAY['owner', 'manager', 'landlord'])))))) WITH CHECK ((EXISTS ( SELECT 1 FROM user_addresses ua JOIN addresses a ON a.id = ua.address_id JOIN properties p ON p.address_id = a.id WHERE ((p.id = invoices.property_id) AND (ua.user_id = auth.uid()) AND ((ua.role)::text = ANY (ARRAY['owner', 'manager', 'landlord']))))));

-- PROPERTIES
CREATE POLICY "properties_select_optimized" ON public.properties FOR SELECT USING ((EXISTS ( SELECT 1 FROM user_addresses ua JOIN addresses a ON a.id = ua.address_id WHERE ((a.id = properties.address_id) AND (ua.user_id = auth.uid())))));
CREATE POLICY "properties_manage_optimized" ON public.properties FOR ALL USING ((EXISTS ( SELECT 1 FROM user_addresses ua JOIN addresses a ON a.id = ua.address_id WHERE ((a.id = properties.address_id) AND (ua.user_id = auth.uid()) AND ((ua.role)::text = ANY (ARRAY['owner', 'manager', 'landlord'])))))) WITH CHECK ((EXISTS ( SELECT 1 FROM user_addresses ua JOIN addresses a ON a.id = ua.address_id WHERE ((a.id = properties.address_id) AND (ua.user_id = auth.uid()) AND ((ua.role)::text = ANY (ARRAY['owner', 'manager', 'landlord']))))));

-- PROPERTY_METER_CONFIGS
CREATE POLICY "property_meter_configs_select_optimized" ON public.property_meter_configs FOR SELECT USING ((EXISTS ( SELECT 1 FROM user_addresses ua JOIN addresses a ON a.id = ua.address_id WHERE ((a.id = property_meter_configs.address_id) AND (ua.user_id = auth.uid())))));
CREATE POLICY "property_meter_configs_manage_optimized" ON public.property_meter_configs FOR ALL USING ((EXISTS ( SELECT 1 FROM user_addresses ua JOIN addresses a ON a.id = ua.address_id WHERE ((a.id = property_meter_configs.address_id) AND (ua.user_id = auth.uid()) AND ((ua.role)::text = ANY (ARRAY['owner', 'manager', 'landlord'])))))) WITH CHECK ((EXISTS ( SELECT 1 FROM user_addresses ua JOIN addresses a ON a.id = ua.address_id WHERE ((a.id = property_meter_configs.address_id) AND (ua.user_id = auth.uid()) AND ((ua.role)::text = ANY (ARRAY['owner', 'manager', 'landlord']))))));

-- USERS
CREATE POLICY "users_select_optimized" ON public.users FOR SELECT USING ((id = auth.uid()));
CREATE POLICY "users_insert_optimized" ON public.users FOR INSERT WITH CHECK ((id = auth.uid()));
CREATE POLICY "users_update_optimized" ON public.users FOR UPDATE USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));
CREATE POLICY "Users can delete own user" ON public.users FOR DELETE USING ((auth.uid() = id));

-- USER_ADDRESSES
CREATE POLICY "user_addresses_select_optimized" ON public.user_addresses FOR SELECT USING (((EXISTS ( SELECT 1 FROM users u WHERE ((u.id = auth.uid()) AND ((u.role)::text = 'admin'::text)))) OR (user_id = auth.uid())));
CREATE POLICY "user_addresses_insert_optimized" ON public.user_addresses FOR INSERT WITH CHECK (((user_id = auth.uid()) OR (EXISTS ( SELECT 1 FROM users u WHERE ((u.id = auth.uid()) AND ((u.role)::text = 'admin'::text))))));
CREATE POLICY "user_addresses_update_optimized" ON public.user_addresses FOR UPDATE USING (((EXISTS ( SELECT 1 FROM users u WHERE ((u.id = auth.uid()) AND ((u.role)::text = 'admin'::text)))) OR (user_id = auth.uid()))) WITH CHECK (((EXISTS ( SELECT 1 FROM users u WHERE ((u.id = auth.uid()) AND ((u.role)::text = 'admin'::text)))) OR (user_id = auth.uid())));
CREATE POLICY "user_addresses_delete_optimized" ON public.user_addresses FOR DELETE USING (((EXISTS ( SELECT 1 FROM users u WHERE ((u.id = auth.uid()) AND ((u.role)::text = 'admin'::text)))) OR (user_id = auth.uid())));

-- ADDRESSES
CREATE POLICY "addresses_select_optimized" ON public.addresses FOR SELECT USING (((EXISTS ( SELECT 1 FROM users u WHERE ((u.id = auth.uid()) AND ((u.role)::text = 'admin'::text)))) OR (EXISTS ( SELECT 1 FROM user_addresses ua WHERE ((ua.address_id = addresses.id) AND (ua.user_id = auth.uid())))) OR (created_by = auth.uid())));
CREATE POLICY "addresses_insert_optimized" ON public.addresses FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY "addresses_update_optimized" ON public.addresses FOR UPDATE USING (((EXISTS ( SELECT 1 FROM users u WHERE ((u.id = auth.uid()) AND ((u.role)::text = 'admin'::text)))) OR (EXISTS ( SELECT 1 FROM user_addresses ua WHERE ((ua.address_id = addresses.id) AND (ua.user_id = auth.uid()) AND ((ua.role)::text = ANY (ARRAY['owner', 'manager', 'landlord']))))) OR (created_by = auth.uid()))) WITH CHECK (((EXISTS ( SELECT 1 FROM users u WHERE ((u.id = auth.uid()) AND ((u.role)::text = 'admin'::text)))) OR (EXISTS ( SELECT 1 FROM user_addresses ua WHERE ((ua.address_id = addresses.id) AND (ua.user_id = auth.uid()) AND ((ua.role)::text = ANY (ARRAY['owner', 'manager', 'landlord']))))) OR (created_by = auth.uid())));
CREATE POLICY "addresses_delete_optimized" ON public.addresses FOR DELETE USING (((EXISTS ( SELECT 1 FROM users u WHERE ((u.id = auth.uid()) AND ((u.role)::text = 'admin'::text)))) OR (EXISTS ( SELECT 1 FROM user_addresses ua WHERE ((ua.address_id = addresses.id) AND (ua.user_id = auth.uid()) AND ((ua.role)::text = 'landlord'::text)))) OR (created_by = auth.uid())));

-- TENANT_INVITATIONS
CREATE POLICY "tenant_invitations_select_optimized" ON public.tenant_invitations FOR SELECT USING (((lower(email) = lower(COALESCE((auth.jwt() ->> 'email'), ''))) OR (invited_by = auth.uid())));
CREATE POLICY "tenant_invitations_insert_optimized" ON public.tenant_invitations FOR INSERT WITH CHECK ((invited_by = auth.uid()));
CREATE POLICY "tenant_invitations_update_optimized" ON public.tenant_invitations FOR UPDATE USING ((((status = 'pending') AND (lower(email) = lower(COALESCE((auth.jwt() ->> 'email'), '')))) OR (invited_by = auth.uid()))) WITH CHECK (((lower(email) = lower(COALESCE((auth.jwt() ->> 'email'), ''))) OR (invited_by = auth.uid())));
CREATE POLICY "tenant_invitations_delete_optimized" ON public.tenant_invitations FOR DELETE USING ((invited_by = auth.uid()));

-- TENANTS
CREATE POLICY "tenants_read" ON public.tenants FOR SELECT USING (has_access_to_property(property_id));
CREATE POLICY "tenants_write" ON public.tenants FOR INSERT WITH CHECK (has_access_to_property(property_id));
CREATE POLICY "tenants_update" ON public.tenants FOR UPDATE USING (has_access_to_property(property_id)) WITH CHECK (has_access_to_property(property_id));

-- NOTIFICATIONS
CREATE POLICY "notifications_select_optimized" ON public.notifications FOR SELECT USING ((user_id = auth.uid()));
CREATE POLICY "notifications_update_optimized" ON public.notifications FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "notifications_insert_optimized" ON public.notifications FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));

-- PASSWORD_RESETS
CREATE POLICY "Users can manage their password reset tokens" ON public.password_resets FOR ALL USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

-- COMMUNAL_METERS
CREATE POLICY "communal_meters_select_optimized" ON public.communal_meters FOR SELECT USING ((EXISTS ( SELECT 1 FROM addresses a WHERE ((a.id = communal_meters.address_id) AND (a.created_by = auth.uid())))));
CREATE POLICY "communal_meters_mutate_optimized" ON public.communal_meters FOR ALL USING ((EXISTS ( SELECT 1 FROM addresses a WHERE ((a.id = communal_meters.address_id) AND (a.created_by = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1 FROM addresses a WHERE ((a.id = communal_meters.address_id) AND (a.created_by = auth.uid())))));

-- COMMUNAL_EXPENSES
CREATE POLICY "communal_expenses_read" ON public.communal_expenses FOR SELECT USING (has_access_to_address(address_id));

-- ADDRESS_SETTINGS
CREATE POLICY "address_settings_read" ON public.address_settings FOR SELECT USING (has_access_to_address(address_id));
CREATE POLICY "Users can insert their address_settings" ON public.address_settings FOR INSERT WITH CHECK ((EXISTS ( SELECT 1 FROM user_addresses ua WHERE ((ua.address_id = address_settings.address_id) AND (ua.user_id = auth.uid())))));
CREATE POLICY "Users can update their address_settings" ON public.address_settings FOR UPDATE USING ((EXISTS ( SELECT 1 FROM user_addresses ua WHERE ((ua.address_id = address_settings.address_id) AND (ua.user_id = auth.uid())))));

-- USER_METER_TEMPLATES
CREATE POLICY "user_meter_templates_manage_optimized" ON public.user_meter_templates FOR ALL USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

-- USER_HIDDEN_METER_TEMPLATES
CREATE POLICY "user_hidden_meter_templates_manage_optimized" ON public.user_hidden_meter_templates FOR ALL USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

-- PROFILES
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));
CREATE POLICY "Public can lookup username for auth" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));
CREATE POLICY "Users can delete own profile" ON public.profiles FOR DELETE USING ((auth.uid() = id));

-- =============================================
-- SUCCESS!
-- =============================================
SELECT 'Production RLS policies applied successfully!' as status;

-- =============================================
-- STAGING RLS POLICIES FIX
-- Run this in Supabase SQL Editor
-- =============================================

-- USERS table policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

CREATE POLICY "Users can view all users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Service role full access users" ON public.users FOR ALL USING (auth.role() = 'service_role');

-- PROFILES table policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ADDRESSES table policies
CREATE POLICY "Users can view all addresses" ON public.addresses FOR SELECT USING (true);
CREATE POLICY "Users can insert addresses" ON public.addresses FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own addresses" ON public.addresses FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own addresses" ON public.addresses FOR DELETE USING (auth.uid() = created_by);

-- PROPERTIES table policies
CREATE POLICY "Users can view all properties" ON public.properties FOR SELECT USING (true);
CREATE POLICY "Users can insert properties" ON public.properties FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own properties" ON public.properties FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own properties" ON public.properties FOR DELETE USING (auth.uid() = owner_id);

-- USER_ADDRESSES table policies
CREATE POLICY "Users can view own user_addresses" ON public.user_addresses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own user_addresses" ON public.user_addresses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own user_addresses" ON public.user_addresses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own user_addresses" ON public.user_addresses FOR DELETE USING (auth.uid() = user_id);

-- ADDRESS_METERS table policies
CREATE POLICY "Users can view address_meters" ON public.address_meters FOR SELECT USING (true);
CREATE POLICY "Users can manage address_meters" ON public.address_meters FOR ALL USING (true);

-- APARTMENT_METERS table policies
CREATE POLICY "Users can view apartment_meters" ON public.apartment_meters FOR SELECT USING (true);
CREATE POLICY "Users can manage apartment_meters" ON public.apartment_meters FOR ALL USING (true);

-- PROPERTY_METER_CONFIGS table policies
CREATE POLICY "Users can view property_meter_configs" ON public.property_meter_configs FOR SELECT USING (true);
CREATE POLICY "Users can manage property_meter_configs" ON public.property_meter_configs FOR ALL USING (true);

-- METER_READINGS table policies
CREATE POLICY "Users can view meter_readings" ON public.meter_readings FOR SELECT USING (true);
CREATE POLICY "Users can manage meter_readings" ON public.meter_readings FOR ALL USING (true);

-- INVOICES table policies
CREATE POLICY "Users can view invoices" ON public.invoices FOR SELECT USING (true);
CREATE POLICY "Users can manage invoices" ON public.invoices FOR ALL USING (true);

-- TENANT_INVITATIONS table policies
CREATE POLICY "Users can view tenant_invitations" ON public.tenant_invitations FOR SELECT USING (true);
CREATE POLICY "Users can insert tenant_invitations" ON public.tenant_invitations FOR INSERT WITH CHECK (auth.uid() = invited_by);
CREATE POLICY "Users can update tenant_invitations" ON public.tenant_invitations FOR UPDATE USING (true);

-- TENANTS table policies
CREATE POLICY "Users can view tenants" ON public.tenants FOR SELECT USING (true);
CREATE POLICY "Users can manage tenants" ON public.tenants FOR ALL USING (true);

-- NOTIFICATIONS table policies
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- CONVERSATIONS table policies
CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT USING (auth.uid() = participant_1 OR auth.uid() = participant_2);
CREATE POLICY "Users can insert conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- MESSAGES table policies
CREATE POLICY "Users can view messages in their conversations" ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid()))
);
CREATE POLICY "Users can insert messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update own messages" ON public.messages FOR UPDATE USING (auth.uid() = sender_id);

-- USER_METER_TEMPLATES table policies
CREATE POLICY "Users can view own templates" ON public.user_meter_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own templates" ON public.user_meter_templates FOR ALL USING (auth.uid() = user_id);

-- USER_HIDDEN_METER_TEMPLATES table policies
CREATE POLICY "Users can view own hidden templates" ON public.user_hidden_meter_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own hidden templates" ON public.user_hidden_meter_templates FOR ALL USING (auth.uid() = user_id);

-- COMMUNAL_METERS table policies
CREATE POLICY "Users can view communal_meters" ON public.communal_meters FOR SELECT USING (true);
CREATE POLICY "Users can manage communal_meters" ON public.communal_meters FOR ALL USING (true);

-- COMMUNAL_EXPENSES table policies
CREATE POLICY "Users can view communal_expenses" ON public.communal_expenses FOR SELECT USING (true);
CREATE POLICY "Users can manage communal_expenses" ON public.communal_expenses FOR ALL USING (true);

-- ADDRESS_SETTINGS table policies
CREATE POLICY "Users can view address_settings" ON public.address_settings FOR SELECT USING (true);
CREATE POLICY "Users can manage address_settings" ON public.address_settings FOR ALL USING (true);

-- PASSWORD_RESETS table policies
CREATE POLICY "Users can view own password_resets" ON public.password_resets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own password_resets" ON public.password_resets FOR ALL USING (auth.uid() = user_id);

-- USER_PERMISSIONS table policies
CREATE POLICY "Users can view own permissions" ON public.user_permissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage permissions" ON public.user_permissions FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- REQUIRED FUNCTIONS
-- =============================================

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

-- ensure_user_row function (if not exists)
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
GRANT EXECUTE ON FUNCTION public.check_username_available(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_username_available(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.ensure_user_row(TEXT, TEXT, TEXT) TO authenticated;

-- Success message
SELECT 'RLS policies and functions added successfully!' as status;

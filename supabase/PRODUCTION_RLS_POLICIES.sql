-- =============================================
-- PRODUCTION RLS POLICIES EXPORT
-- Exported: 2026-01-20
-- Total: 67 policies
-- =============================================
-- Run this in Staging SQL Editor to sync RLS policies

-- =============================================
-- ADDRESS_METERS POLICIES
-- =============================================
DROP POLICY IF EXISTS "Managers can manage meters for their addresses" ON public.address_meters;
CREATE POLICY "Managers can manage meters for their addresses" ON public.address_meters FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM user_addresses ua
  WHERE ((ua.address_id = address_meters.address_id) AND (ua.user_id = auth.uid()) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM user_addresses ua
  WHERE ((ua.address_id = address_meters.address_id) AND (ua.user_id = auth.uid()) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[]))))));

DROP POLICY IF EXISTS "Users can view meters for their addresses" ON public.address_meters;
CREATE POLICY "Users can view meters for their addresses" ON public.address_meters FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM user_addresses ua
  WHERE ((ua.address_id = address_meters.address_id) AND (ua.user_id = auth.uid())))));

DROP POLICY IF EXISTS "address_meters_manage_optimized" ON public.address_meters;
CREATE POLICY "address_meters_manage_optimized" ON public.address_meters FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM user_addresses ua
  WHERE ((ua.address_id = address_meters.address_id) AND (ua.user_id = ( SELECT auth.uid() AS uid)) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'landlord'::character varying])::text[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM user_addresses ua
  WHERE ((ua.address_id = address_meters.address_id) AND (ua.user_id = ( SELECT auth.uid() AS uid)) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'landlord'::character varying])::text[]))))));

DROP POLICY IF EXISTS "address_meters_select_optimized" ON public.address_meters;
CREATE POLICY "address_meters_select_optimized" ON public.address_meters FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM user_addresses ua
  WHERE ((ua.address_id = address_meters.address_id) AND (ua.user_id = ( SELECT auth.uid() AS uid))))));

-- =============================================
-- ADDRESS_SETTINGS POLICIES
-- =============================================
DROP POLICY IF EXISTS "Users can insert their address_settings" ON public.address_settings;
CREATE POLICY "Users can insert their address_settings" ON public.address_settings FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM user_addresses ua
  WHERE ((ua.address_id = address_settings.address_id) AND (ua.user_id = auth.uid())))));

DROP POLICY IF EXISTS "Users can update their address_settings" ON public.address_settings;
CREATE POLICY "Users can update their address_settings" ON public.address_settings FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM user_addresses ua
  WHERE ((ua.address_id = address_settings.address_id) AND (ua.user_id = auth.uid())))));

DROP POLICY IF EXISTS "address_settings_read" ON public.address_settings;
CREATE POLICY "address_settings_read" ON public.address_settings FOR SELECT TO public USING (has_access_to_address(address_id));

-- =============================================
-- ADDRESSES POLICIES
-- =============================================
DROP POLICY IF EXISTS "addresses_delete_optimized" ON public.addresses;
CREATE POLICY "addresses_delete_optimized" ON public.addresses FOR DELETE TO public USING (((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND ((u.role)::text = 'admin'::text)))) OR (EXISTS ( SELECT 1
   FROM user_addresses ua
  WHERE ((ua.address_id = addresses.id) AND (ua.user_id = ( SELECT auth.uid() AS uid)) AND ((ua.role)::text = 'landlord'::text)))) OR (created_by = ( SELECT auth.uid() AS uid))));

DROP POLICY IF EXISTS "addresses_insert_optimized" ON public.addresses;
CREATE POLICY "addresses_insert_optimized" ON public.addresses FOR INSERT TO public WITH CHECK ((( SELECT auth.uid() AS uid) IS NOT NULL));

DROP POLICY IF EXISTS "addresses_select_optimized" ON public.addresses;
CREATE POLICY "addresses_select_optimized" ON public.addresses FOR SELECT TO public USING (((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND ((u.role)::text = 'admin'::text)))) OR (EXISTS ( SELECT 1
   FROM user_addresses ua
  WHERE ((ua.address_id = addresses.id) AND (ua.user_id = ( SELECT auth.uid() AS uid))))) OR (created_by = ( SELECT auth.uid() AS uid))));

DROP POLICY IF EXISTS "addresses_update_optimized" ON public.addresses;
CREATE POLICY "addresses_update_optimized" ON public.addresses FOR UPDATE TO public USING (((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND ((u.role)::text = 'admin'::text)))) OR (EXISTS ( SELECT 1
   FROM user_addresses ua
  WHERE ((ua.address_id = addresses.id) AND (ua.user_id = ( SELECT auth.uid() AS uid)) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'landlord'::character varying])::text[]))))) OR (created_by = ( SELECT auth.uid() AS uid)))) WITH CHECK (((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND ((u.role)::text = 'admin'::text)))) OR (EXISTS ( SELECT 1
   FROM user_addresses ua
  WHERE ((ua.address_id = addresses.id) AND (ua.user_id = ( SELECT auth.uid() AS uid)) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'landlord'::character varying])::text[]))))) OR (created_by = ( SELECT auth.uid() AS uid))));

-- =============================================
-- APARTMENT_METERS POLICIES
-- =============================================
DROP POLICY IF EXISTS "Managers can manage apartment meters" ON public.apartment_meters;
CREATE POLICY "Managers can manage apartment meters" ON public.apartment_meters FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM ((user_addresses ua
     JOIN addresses a ON ((a.id = ua.address_id)))
     JOIN properties p ON ((p.address_id = a.id)))
  WHERE ((p.id = apartment_meters.property_id) AND (ua.user_id = auth.uid()) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ((user_addresses ua
     JOIN addresses a ON ((a.id = ua.address_id)))
     JOIN properties p ON ((p.address_id = a.id)))
  WHERE ((p.id = apartment_meters.property_id) AND (ua.user_id = auth.uid()) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[]))))));

DROP POLICY IF EXISTS "Users can view apartment meters for their addresses" ON public.apartment_meters;
CREATE POLICY "Users can view apartment meters for their addresses" ON public.apartment_meters FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM ((user_addresses ua
     JOIN addresses a ON ((a.id = ua.address_id)))
     JOIN properties p ON ((p.address_id = a.id)))
  WHERE ((p.id = apartment_meters.property_id) AND (ua.user_id = auth.uid())))));

DROP POLICY IF EXISTS "apartment_meters_manage_optimized" ON public.apartment_meters;
CREATE POLICY "apartment_meters_manage_optimized" ON public.apartment_meters FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM ((user_addresses ua
     JOIN addresses a ON ((a.id = ua.address_id)))
     JOIN properties p ON ((p.address_id = a.id)))
  WHERE ((p.id = apartment_meters.property_id) AND (ua.user_id = ( SELECT auth.uid() AS uid)) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'landlord'::character varying])::text[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ((user_addresses ua
     JOIN addresses a ON ((a.id = ua.address_id)))
     JOIN properties p ON ((p.address_id = a.id)))
  WHERE ((p.id = apartment_meters.property_id) AND (ua.user_id = ( SELECT auth.uid() AS uid)) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'landlord'::character varying])::text[]))))));

DROP POLICY IF EXISTS "apartment_meters_select_optimized" ON public.apartment_meters;
CREATE POLICY "apartment_meters_select_optimized" ON public.apartment_meters FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM ((user_addresses ua
     JOIN addresses a ON ((a.id = ua.address_id)))
     JOIN properties p ON ((p.address_id = a.id)))
  WHERE ((p.id = apartment_meters.property_id) AND (ua.user_id = ( SELECT auth.uid() AS uid))))));

-- =============================================
-- COMMUNAL_EXPENSES POLICIES
-- =============================================
DROP POLICY IF EXISTS "communal_expenses_read" ON public.communal_expenses;
CREATE POLICY "communal_expenses_read" ON public.communal_expenses FOR SELECT TO public USING (has_access_to_address(address_id));

-- =============================================
-- COMMUNAL_METERS POLICIES
-- =============================================
DROP POLICY IF EXISTS "communal_meters_mutate_optimized" ON public.communal_meters;
CREATE POLICY "communal_meters_mutate_optimized" ON public.communal_meters FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM addresses a
  WHERE ((a.id = communal_meters.address_id) AND (a.created_by = ( SELECT auth.uid() AS uid)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM addresses a
  WHERE ((a.id = communal_meters.address_id) AND (a.created_by = ( SELECT auth.uid() AS uid))))));

DROP POLICY IF EXISTS "communal_meters_select_optimized" ON public.communal_meters;
CREATE POLICY "communal_meters_select_optimized" ON public.communal_meters FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM addresses a
  WHERE ((a.id = communal_meters.address_id) AND (a.created_by = ( SELECT auth.uid() AS uid))))));

-- =============================================
-- CONVERSATIONS POLICIES
-- =============================================
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT TO public WITH CHECK (((auth.uid() = participant_1) OR (auth.uid() = participant_2)));

DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT TO public USING (((auth.uid() = participant_1) OR (auth.uid() = participant_2)));

-- =============================================
-- INVOICES POLICIES
-- =============================================
DROP POLICY IF EXISTS "Managers can manage invoices" ON public.invoices;
CREATE POLICY "Managers can manage invoices" ON public.invoices FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM ((user_addresses ua
     JOIN addresses a ON ((a.id = ua.address_id)))
     JOIN properties p ON ((p.address_id = a.id)))
  WHERE ((p.id = invoices.property_id) AND (ua.user_id = auth.uid()) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ((user_addresses ua
     JOIN addresses a ON ((a.id = ua.address_id)))
     JOIN properties p ON ((p.address_id = a.id)))
  WHERE ((p.id = invoices.property_id) AND (ua.user_id = auth.uid()) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[]))))));

DROP POLICY IF EXISTS "Users can view invoices for their properties" ON public.invoices;
CREATE POLICY "Users can view invoices for their properties" ON public.invoices FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM ((user_addresses ua
     JOIN addresses a ON ((a.id = ua.address_id)))
     JOIN properties p ON ((p.address_id = a.id)))
  WHERE ((p.id = invoices.property_id) AND (ua.user_id = auth.uid())))));

DROP POLICY IF EXISTS "invoices_manage_optimized" ON public.invoices;
CREATE POLICY "invoices_manage_optimized" ON public.invoices FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM ((user_addresses ua
     JOIN addresses a ON ((a.id = ua.address_id)))
     JOIN properties p ON ((p.address_id = a.id)))
  WHERE ((p.id = invoices.property_id) AND (ua.user_id = ( SELECT auth.uid() AS uid)) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'landlord'::character varying])::text[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ((user_addresses ua
     JOIN addresses a ON ((a.id = ua.address_id)))
     JOIN properties p ON ((p.address_id = a.id)))
  WHERE ((p.id = invoices.property_id) AND (ua.user_id = ( SELECT auth.uid() AS uid)) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'landlord'::character varying])::text[]))))));

DROP POLICY IF EXISTS "invoices_select_optimized" ON public.invoices;
CREATE POLICY "invoices_select_optimized" ON public.invoices FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM ((user_addresses ua
     JOIN addresses a ON ((a.id = ua.address_id)))
     JOIN properties p ON ((p.address_id = a.id)))
  WHERE ((p.id = invoices.property_id) AND (ua.user_id = ( SELECT auth.uid() AS uid))))));

-- =============================================
-- MESSAGES POLICIES
-- =============================================
DROP POLICY IF EXISTS "Users can mark messages as read" ON public.messages;
CREATE POLICY "Users can mark messages as read" ON public.messages FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM conversations c
  WHERE ((c.id = messages.conversation_id) AND ((c.participant_1 = auth.uid()) OR (c.participant_2 = auth.uid())))))) WITH CHECK ((is_read = true));

DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;
CREATE POLICY "Users can send messages in their conversations" ON public.messages FOR INSERT TO public WITH CHECK (((sender_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM conversations c
  WHERE ((c.id = messages.conversation_id) AND ((c.participant_1 = auth.uid()) OR (c.participant_2 = auth.uid())))))));

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations" ON public.messages FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM conversations c
  WHERE ((c.id = messages.conversation_id) AND ((c.participant_1 = auth.uid()) OR (c.participant_2 = auth.uid()))))));

-- =============================================
-- METER_READINGS POLICIES
-- =============================================
DROP POLICY IF EXISTS "meter_readings_read" ON public.meter_readings;
CREATE POLICY "meter_readings_read" ON public.meter_readings FOR SELECT TO public USING (has_access_to_property(property_id));

DROP POLICY IF EXISTS "meter_readings_update" ON public.meter_readings;
CREATE POLICY "meter_readings_update" ON public.meter_readings FOR UPDATE TO public USING (has_access_to_property(property_id)) WITH CHECK (has_access_to_property(property_id));

DROP POLICY IF EXISTS "meter_readings_write" ON public.meter_readings;
CREATE POLICY "meter_readings_write" ON public.meter_readings FOR INSERT TO public WITH CHECK (has_access_to_property(property_id));

-- =============================================
-- NOTIFICATIONS POLICIES
-- =============================================
DROP POLICY IF EXISTS "notifications_insert_optimized" ON public.notifications;
CREATE POLICY "notifications_insert_optimized" ON public.notifications FOR INSERT TO public WITH CHECK ((( SELECT auth.uid() AS uid) IS NOT NULL));

DROP POLICY IF EXISTS "notifications_select_optimized" ON public.notifications;
CREATE POLICY "notifications_select_optimized" ON public.notifications FOR SELECT TO public USING ((user_id = ( SELECT auth.uid() AS uid)));

DROP POLICY IF EXISTS "notifications_update_optimized" ON public.notifications;
CREATE POLICY "notifications_update_optimized" ON public.notifications FOR UPDATE TO public USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

-- =============================================
-- PASSWORD_RESETS POLICIES
-- =============================================
DROP POLICY IF EXISTS "Users can manage their password reset tokens" ON public.password_resets;
CREATE POLICY "Users can manage their password reset tokens" ON public.password_resets FOR ALL TO public USING ((( SELECT auth.uid() AS uid) = user_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- =============================================
-- PROFILES POLICIES
-- =============================================
DROP POLICY IF EXISTS "Public can lookup username for auth" ON public.profiles;
CREATE POLICY "Public can lookup username for auth" ON public.profiles FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile" ON public.profiles FOR DELETE TO public USING ((auth.uid() = id));

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO public WITH CHECK ((auth.uid() = id));

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO public USING ((auth.uid() = id));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO public USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));

-- =============================================
-- PROPERTIES POLICIES
-- =============================================
DROP POLICY IF EXISTS "Managers can manage properties" ON public.properties;
CREATE POLICY "Managers can manage properties" ON public.properties FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM (user_addresses ua
     JOIN addresses a ON ((a.id = ua.address_id)))
  WHERE ((a.id = properties.address_id) AND (ua.user_id = auth.uid()) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (user_addresses ua
     JOIN addresses a ON ((a.id = ua.address_id)))
  WHERE ((a.id = properties.address_id) AND (ua.user_id = auth.uid()) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[]))))));

DROP POLICY IF EXISTS "Users can view properties for their addresses" ON public.properties;
CREATE POLICY "Users can view properties for their addresses" ON public.properties FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM (user_addresses ua
     JOIN addresses a ON ((a.id = ua.address_id)))
  WHERE ((a.id = properties.address_id) AND (ua.user_id = auth.uid())))));

DROP POLICY IF EXISTS "properties_manage_optimized" ON public.properties;
CREATE POLICY "properties_manage_optimized" ON public.properties FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM (user_addresses ua
     JOIN addresses a ON ((a.id = ua.address_id)))
  WHERE ((a.id = properties.address_id) AND (ua.user_id = ( SELECT auth.uid() AS uid)) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'landlord'::character varying])::text[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (user_addresses ua
     JOIN addresses a ON ((a.id = ua.address_id)))
  WHERE ((a.id = properties.address_id) AND (ua.user_id = ( SELECT auth.uid() AS uid)) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'landlord'::character varying])::text[]))))));

DROP POLICY IF EXISTS "properties_select_optimized" ON public.properties;
CREATE POLICY "properties_select_optimized" ON public.properties FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM (user_addresses ua
     JOIN addresses a ON ((a.id = ua.address_id)))
  WHERE ((a.id = properties.address_id) AND (ua.user_id = ( SELECT auth.uid() AS uid))))));

-- =============================================
-- PROPERTY_METER_CONFIGS POLICIES
-- =============================================
DROP POLICY IF EXISTS "Managers can manage meter configs" ON public.property_meter_configs;
CREATE POLICY "Managers can manage meter configs" ON public.property_meter_configs FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM (user_addresses ua
     JOIN addresses a ON ((a.id = ua.address_id)))
  WHERE ((a.id = property_meter_configs.address_id) AND (ua.user_id = auth.uid()) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (user_addresses ua
     JOIN addresses a ON ((a.id = ua.address_id)))
  WHERE ((a.id = property_meter_configs.address_id) AND (ua.user_id = auth.uid()) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying])::text[]))))));

DROP POLICY IF EXISTS "Users can view meter configs for their addresses" ON public.property_meter_configs;
CREATE POLICY "Users can view meter configs for their addresses" ON public.property_meter_configs FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM (user_addresses ua
     JOIN addresses a ON ((a.id = ua.address_id)))
  WHERE ((a.id = property_meter_configs.address_id) AND (ua.user_id = auth.uid())))));

DROP POLICY IF EXISTS "property_meter_configs_manage_optimized" ON public.property_meter_configs;
CREATE POLICY "property_meter_configs_manage_optimized" ON public.property_meter_configs FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM (user_addresses ua
     JOIN addresses a ON ((a.id = ua.address_id)))
  WHERE ((a.id = property_meter_configs.address_id) AND (ua.user_id = ( SELECT auth.uid() AS uid)) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'landlord'::character varying])::text[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (user_addresses ua
     JOIN addresses a ON ((a.id = ua.address_id)))
  WHERE ((a.id = property_meter_configs.address_id) AND (ua.user_id = ( SELECT auth.uid() AS uid)) AND ((ua.role)::text = ANY ((ARRAY['owner'::character varying, 'manager'::character varying, 'landlord'::character varying])::text[]))))));

DROP POLICY IF EXISTS "property_meter_configs_select_optimized" ON public.property_meter_configs;
CREATE POLICY "property_meter_configs_select_optimized" ON public.property_meter_configs FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM (user_addresses ua
     JOIN addresses a ON ((a.id = ua.address_id)))
  WHERE ((a.id = property_meter_configs.address_id) AND (ua.user_id = ( SELECT auth.uid() AS uid))))));

-- =============================================
-- TENANT_INVITATIONS POLICIES
-- =============================================
DROP POLICY IF EXISTS "tenant_invitations_delete_optimized" ON public.tenant_invitations;
CREATE POLICY "tenant_invitations_delete_optimized" ON public.tenant_invitations FOR DELETE TO public USING ((invited_by = ( SELECT auth.uid() AS uid)));

DROP POLICY IF EXISTS "tenant_invitations_insert_optimized" ON public.tenant_invitations;
CREATE POLICY "tenant_invitations_insert_optimized" ON public.tenant_invitations FOR INSERT TO public WITH CHECK ((invited_by = ( SELECT auth.uid() AS uid)));

DROP POLICY IF EXISTS "tenant_invitations_select_optimized" ON public.tenant_invitations;
CREATE POLICY "tenant_invitations_select_optimized" ON public.tenant_invitations FOR SELECT TO public USING (((lower(email) = lower(COALESCE(( SELECT (auth.jwt() ->> 'email'::text)), ''::text))) OR (invited_by = ( SELECT auth.uid() AS uid))));

DROP POLICY IF EXISTS "tenant_invitations_update_optimized" ON public.tenant_invitations;
CREATE POLICY "tenant_invitations_update_optimized" ON public.tenant_invitations FOR UPDATE TO public USING ((((status = 'pending'::text) AND (lower(email) = lower(COALESCE(( SELECT (auth.jwt() ->> 'email'::text)), ''::text)))) OR (invited_by = ( SELECT auth.uid() AS uid)))) WITH CHECK (((lower(email) = lower(COALESCE(( SELECT (auth.jwt() ->> 'email'::text)), ''::text))) OR (invited_by = ( SELECT auth.uid() AS uid))));

-- =============================================
-- TENANTS POLICIES
-- =============================================
DROP POLICY IF EXISTS "tenants_read" ON public.tenants;
CREATE POLICY "tenants_read" ON public.tenants FOR SELECT TO public USING (has_access_to_property(property_id));

DROP POLICY IF EXISTS "tenants_update" ON public.tenants;
CREATE POLICY "tenants_update" ON public.tenants FOR UPDATE TO public USING (has_access_to_property(property_id)) WITH CHECK (has_access_to_property(property_id));

DROP POLICY IF EXISTS "tenants_write" ON public.tenants;
CREATE POLICY "tenants_write" ON public.tenants FOR INSERT TO public WITH CHECK (has_access_to_property(property_id));

-- =============================================
-- USER_ADDRESSES POLICIES
-- =============================================
DROP POLICY IF EXISTS "Users can delete their own address links" ON public.user_addresses;
CREATE POLICY "Users can delete their own address links" ON public.user_addresses FOR DELETE TO public USING ((user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update their own address links" ON public.user_addresses;
CREATE POLICY "Users can update their own address links" ON public.user_addresses FOR UPDATE TO public USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view their own address links" ON public.user_addresses;
CREATE POLICY "Users can view their own address links" ON public.user_addresses FOR SELECT TO public USING ((user_id = auth.uid()));

DROP POLICY IF EXISTS "user_addresses_delete_optimized" ON public.user_addresses;
CREATE POLICY "user_addresses_delete_optimized" ON public.user_addresses FOR DELETE TO public USING (((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND ((u.role)::text = 'admin'::text)))) OR (user_id = ( SELECT auth.uid() AS uid))));

DROP POLICY IF EXISTS "user_addresses_insert_optimized" ON public.user_addresses;
CREATE POLICY "user_addresses_insert_optimized" ON public.user_addresses FOR INSERT TO public WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND ((u.role)::text = 'admin'::text))))));

DROP POLICY IF EXISTS "user_addresses_select_optimized" ON public.user_addresses;
CREATE POLICY "user_addresses_select_optimized" ON public.user_addresses FOR SELECT TO public USING (((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND ((u.role)::text = 'admin'::text)))) OR (user_id = ( SELECT auth.uid() AS uid))));

DROP POLICY IF EXISTS "user_addresses_update_optimized" ON public.user_addresses;
CREATE POLICY "user_addresses_update_optimized" ON public.user_addresses FOR UPDATE TO public USING (((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND ((u.role)::text = 'admin'::text)))) OR (user_id = ( SELECT auth.uid() AS uid)))) WITH CHECK (((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND ((u.role)::text = 'admin'::text)))) OR (user_id = ( SELECT auth.uid() AS uid))));

-- =============================================
-- USER_HIDDEN_METER_TEMPLATES POLICIES
-- =============================================
DROP POLICY IF EXISTS "user_hidden_meter_templates_manage_optimized" ON public.user_hidden_meter_templates;
CREATE POLICY "user_hidden_meter_templates_manage_optimized" ON public.user_hidden_meter_templates FOR ALL TO public USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

-- =============================================
-- USER_METER_TEMPLATES POLICIES
-- =============================================
DROP POLICY IF EXISTS "user_meter_templates_manage_optimized" ON public.user_meter_templates;
CREATE POLICY "user_meter_templates_manage_optimized" ON public.user_meter_templates FOR ALL TO public USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

-- =============================================
-- USERS POLICIES
-- =============================================
DROP POLICY IF EXISTS "Users can delete own user" ON public.users;
CREATE POLICY "Users can delete own user" ON public.users FOR DELETE TO public USING ((auth.uid() = id));

DROP POLICY IF EXISTS "users_insert_optimized" ON public.users;
CREATE POLICY "users_insert_optimized" ON public.users FOR INSERT TO public WITH CHECK ((id = ( SELECT auth.uid() AS uid)));

DROP POLICY IF EXISTS "users_select_optimized" ON public.users;
CREATE POLICY "users_select_optimized" ON public.users FOR SELECT TO public USING ((id = ( SELECT auth.uid() AS uid)));

DROP POLICY IF EXISTS "users_update_optimized" ON public.users;
CREATE POLICY "users_update_optimized" ON public.users FOR UPDATE TO public USING ((id = ( SELECT auth.uid() AS uid))) WITH CHECK ((id = ( SELECT auth.uid() AS uid)));

-- =============================================
-- USER_PERMISSIONS POLICIES (CRITICAL FOR TENANT DASHBOARD)
-- =============================================
DROP POLICY IF EXISTS "user_permissions_select_optimized" ON public.user_permissions;
CREATE POLICY "user_permissions_select_optimized" ON public.user_permissions FOR SELECT TO public USING ((user_id = ( SELECT auth.uid() AS uid)));

DROP POLICY IF EXISTS "user_permissions_manage_optimized" ON public.user_permissions;
CREATE POLICY "user_permissions_manage_optimized" ON public.user_permissions FOR ALL TO public USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================
ALTER TABLE public.address_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.address_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apartment_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communal_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communal_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meter_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_meter_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_hidden_meter_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_meter_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Done!
SELECT 'All 67+ RLS policies applied successfully!' as result;

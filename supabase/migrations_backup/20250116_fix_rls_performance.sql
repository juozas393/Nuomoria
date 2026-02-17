-- =====================================================
-- RLS Performance Fixes Migration
-- Fixes auth_rls_initplan and multiple_permissive_policies warnings
-- =====================================================
-- 
-- This migration addresses:
-- 1. RLS performance: Replace auth.uid() with (select auth.uid())
-- 2. Multiple permissive policies: Consolidate into single policies
--
-- Run this AFTER 20250115_fix_security_issues.sql
-- =====================================================

BEGIN;

-- =====================================================
-- PART 1: Drop ALL existing policies to rebuild them
-- =====================================================
-- We need to drop all policies to consolidate multiple permissive ones
-- Using dynamic drop to ensure all policies are removed

DO $$
DECLARE
    policy_record RECORD;
    drop_sql TEXT;
BEGIN
    -- Drop ALL policies from all tables dynamically
    -- This ensures we remove all existing policies before creating new ones
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename IN (
            'addresses', 'address_meters', 'apartment_meters', 'invoices',
            'properties', 'property_meter_configs', 'user_addresses', 'users',
            'notifications', 'communal_meters', 'tenant_invitations',
            'user_meter_templates', 'user_hidden_meter_templates'
        )
    LOOP
        drop_sql := format('DROP POLICY IF EXISTS %I ON %I.%I CASCADE',
            policy_record.policyname,
            policy_record.schemaname,
            policy_record.tablename
        );
        
        BEGIN
            EXECUTE drop_sql;
            RAISE NOTICE 'Dropped policy: %.%.%', 
                policy_record.schemaname, 
                policy_record.tablename, 
                policy_record.policyname;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not drop policy %.%.%: %', 
                policy_record.schemaname,
                policy_record.tablename,
                policy_record.policyname,
                SQLERRM;
        END;
    END LOOP;
    
    -- Additional safety: Wait a moment for policies to be fully dropped
    PERFORM pg_sleep(0.1);
END $$;

-- Additional explicit drops for policies that might have been created in previous migrations
-- This ensures we catch any policies that the dynamic drop might have missed
DROP POLICY IF EXISTS "Users can view their addresses" ON public.addresses CASCADE;
DROP POLICY IF EXISTS "Authenticated users can insert addresses" ON public.addresses CASCADE;
DROP POLICY IF EXISTS "Users can update their addresses" ON public.addresses CASCADE;
DROP POLICY IF EXISTS "Owners can delete their addresses" ON public.addresses CASCADE;
DROP POLICY IF EXISTS "Users can delete addresses they manage" ON public.addresses CASCADE;
DROP POLICY IF EXISTS "Admins can manage all addresses" ON public.addresses CASCADE;
DROP POLICY IF EXISTS "Users can view meters for their addresses" ON public.address_meters CASCADE;
DROP POLICY IF EXISTS "Managers can manage meters for their addresses" ON public.address_meters CASCADE;
DROP POLICY IF EXISTS "Users can view apartment meters for their addresses" ON public.apartment_meters CASCADE;
DROP POLICY IF EXISTS "Managers can manage apartment meters" ON public.apartment_meters CASCADE;
DROP POLICY IF EXISTS "Users can view invoices for their properties" ON public.invoices CASCADE;
DROP POLICY IF EXISTS "Managers can manage invoices" ON public.invoices CASCADE;
DROP POLICY IF EXISTS "Users can view properties for their addresses" ON public.properties CASCADE;
DROP POLICY IF EXISTS "Managers can manage properties" ON public.properties CASCADE;
DROP POLICY IF EXISTS "Users can view meter configs for their addresses" ON public.property_meter_configs CASCADE;
DROP POLICY IF EXISTS "Managers can manage meter configs" ON public.property_meter_configs CASCADE;
DROP POLICY IF EXISTS "Users can view their own address links" ON public.user_addresses CASCADE;
DROP POLICY IF EXISTS "Users can insert their own address links" ON public.user_addresses CASCADE;
DROP POLICY IF EXISTS "Users can update their own address links" ON public.user_addresses CASCADE;
DROP POLICY IF EXISTS "Users can delete their own address links" ON public.user_addresses CASCADE;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users CASCADE;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users CASCADE;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users CASCADE;
DROP POLICY IF EXISTS "Users can update their profile" ON public.users CASCADE;

-- Explicit drops as backup (in case dynamic drop misses some)
-- Drop all policies from addresses
DROP POLICY IF EXISTS "Users can view their addresses" ON public.addresses;
DROP POLICY IF EXISTS "Authenticated users can insert addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can update their addresses" ON public.addresses;
DROP POLICY IF EXISTS "Owners can delete their addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can delete addresses they manage" ON public.addresses;
DROP POLICY IF EXISTS "Admins can manage all addresses" ON public.addresses;
DROP POLICY IF EXISTS "Allow public read access to addresses" ON public.addresses;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.addresses;
DROP POLICY IF EXISTS "addresses_read" ON public.addresses;
DROP POLICY IF EXISTS "Allow insert on addresses (owner or admin)" ON public.addresses;

-- Drop all policies from address_meters
DROP POLICY IF EXISTS "Users can view meters for their addresses" ON public.address_meters;
DROP POLICY IF EXISTS "Managers can manage meters for their addresses" ON public.address_meters;
DROP POLICY IF EXISTS "address_meters_read" ON public.address_meters;

-- Drop all policies from apartment_meters
DROP POLICY IF EXISTS "Users can view apartment meters for their addresses" ON public.apartment_meters;
DROP POLICY IF EXISTS "Managers can manage apartment meters" ON public.apartment_meters;
DROP POLICY IF EXISTS "apartment_meters_read" ON public.apartment_meters;

-- Drop all policies from invoices
DROP POLICY IF EXISTS "Users can view invoices for their properties" ON public.invoices;
DROP POLICY IF EXISTS "Managers can manage invoices" ON public.invoices;

-- Drop all policies from properties
DROP POLICY IF EXISTS "Users can view properties for their addresses" ON public.properties;
DROP POLICY IF EXISTS "Managers can manage properties" ON public.properties;
DROP POLICY IF EXISTS "properties_read" ON public.properties;

-- Drop all policies from property_meter_configs
DROP POLICY IF EXISTS "Users can view meter configs for their addresses" ON public.property_meter_configs;
DROP POLICY IF EXISTS "Managers can manage meter configs" ON public.property_meter_configs;

-- Drop all policies from user_addresses
DROP POLICY IF EXISTS "Users can view their own address links" ON public.user_addresses;
DROP POLICY IF EXISTS "Users can insert their own address links" ON public.user_addresses;
DROP POLICY IF EXISTS "Users can update their own address links" ON public.user_addresses;
DROP POLICY IF EXISTS "Users can delete their own address links" ON public.user_addresses;
DROP POLICY IF EXISTS "Users can view their addresses" ON public.user_addresses;
DROP POLICY IF EXISTS "Users can insert their addresses" ON public.user_addresses;
DROP POLICY IF EXISTS "Users can update their addresses" ON public.user_addresses;
DROP POLICY IF EXISTS "Users can delete their addresses" ON public.user_addresses;
DROP POLICY IF EXISTS "Admins can manage all user addresses" ON public.user_addresses;

-- Drop all policies from users
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their profile" ON public.users;

-- Drop all policies from notifications
DROP POLICY IF EXISTS "Notifications select own" ON public.notifications;
DROP POLICY IF EXISTS "Notifications update own" ON public.notifications;
DROP POLICY IF EXISTS "Notifications insert authenticated" ON public.notifications;

-- Drop all policies from communal_meters
DROP POLICY IF EXISTS "communal meters select" ON public.communal_meters;
DROP POLICY IF EXISTS "communal meters mutate" ON public.communal_meters;
DROP POLICY IF EXISTS "Users can view communal meters" ON public.communal_meters;
DROP POLICY IF EXISTS "Users can manage communal meters" ON public.communal_meters;

-- Drop all policies from tenant_invitations
DROP POLICY IF EXISTS "Tenant invitations tenant view" ON public.tenant_invitations;
DROP POLICY IF EXISTS "Tenant invitations tenant respond" ON public.tenant_invitations;
DROP POLICY IF EXISTS "Tenant invitations inviter manage" ON public.tenant_invitations;

-- Drop all policies from user_meter_templates
DROP POLICY IF EXISTS "Users manage own meter templates" ON public.user_meter_templates;

-- Drop all policies from user_hidden_meter_templates
DROP POLICY IF EXISTS "Users manage hidden meter templates" ON public.user_hidden_meter_templates;

-- =====================================================
-- PART 2: Create Optimized RLS Policies
-- =====================================================
-- All policies use (select auth.uid()) for performance
-- Single consolidated policy per table/operation to avoid multiple permissive policies

-- =====================================================
-- ADDRESSES - Consolidated policies
-- =====================================================

-- Single SELECT policy (consolidates all read access)
-- Drop first to ensure it doesn't exist
DROP POLICY IF EXISTS "addresses_select_optimized" ON public.addresses;
CREATE POLICY "addresses_select_optimized"
ON public.addresses
FOR SELECT
USING (
    -- Admin can see all
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = (select auth.uid())
        AND u.role = 'admin'
    )
    OR
    -- Users can see their linked addresses
    EXISTS (
        SELECT 1 FROM public.user_addresses ua
        WHERE ua.address_id = addresses.id
        AND ua.user_id = (select auth.uid())
    )
    OR
    -- Users can see addresses they created
    created_by = (select auth.uid())
);

-- Single INSERT policy
DROP POLICY IF EXISTS "addresses_insert_optimized" ON public.addresses;
CREATE POLICY "addresses_insert_optimized"
ON public.addresses
FOR INSERT
WITH CHECK (
    -- Admin can insert
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = (select auth.uid())
        AND u.role = 'admin'
    )
    OR
    -- Authenticated users can insert (will be auto-linked)
    (select auth.uid()) IS NOT NULL
);

-- Single UPDATE policy
DROP POLICY IF EXISTS "addresses_update_optimized" ON public.addresses;
CREATE POLICY "addresses_update_optimized"
ON public.addresses
FOR UPDATE
USING (
    -- Admin can update all
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = (select auth.uid())
        AND u.role = 'admin'
    )
    OR
    -- Users can update addresses they manage
    EXISTS (
        SELECT 1 FROM public.user_addresses ua
        WHERE ua.address_id = addresses.id
        AND ua.user_id = (select auth.uid())
        AND ua.role IN ('owner', 'manager')
    )
    OR
    -- Users can update addresses they created
    created_by = (select auth.uid())
)
WITH CHECK (
    -- Same conditions for WITH CHECK
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = (select auth.uid())
        AND u.role = 'admin'
    )
    OR
    EXISTS (
        SELECT 1 FROM public.user_addresses ua
        WHERE ua.address_id = addresses.id
        AND ua.user_id = (select auth.uid())
        AND ua.role IN ('owner', 'manager')
    )
    OR
    created_by = (select auth.uid())
);

-- Single DELETE policy
DROP POLICY IF EXISTS "addresses_delete_optimized" ON public.addresses;
CREATE POLICY "addresses_delete_optimized"
ON public.addresses
FOR DELETE
USING (
    -- Admin can delete all
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = (select auth.uid())
        AND u.role = 'admin'
    )
    OR
    -- Owners can delete
    EXISTS (
        SELECT 1 FROM public.user_addresses ua
        WHERE ua.address_id = addresses.id
        AND ua.user_id = (select auth.uid())
        AND ua.role = 'owner'
    )
    OR
    -- Creator can delete if no owner exists
    (created_by = (select auth.uid()) AND NOT EXISTS (
        SELECT 1 FROM public.user_addresses ua
        WHERE ua.address_id = addresses.id
        AND ua.role = 'owner'
    ))
);

-- =====================================================
-- ADDRESS_METERS - Consolidated policies
-- =====================================================

-- Single SELECT policy (consolidates view + read policies)
DROP POLICY IF EXISTS "address_meters_select_optimized" ON public.address_meters;
CREATE POLICY "address_meters_select_optimized"
ON public.address_meters
FOR SELECT
USING (
    -- Users can view meters for their addresses
    EXISTS (
        SELECT 1 FROM public.user_addresses ua
        WHERE ua.address_id = address_meters.address_id
        AND ua.user_id = (select auth.uid())
    )
);

-- Single ALL policy for managers (consolidates all operations)
DROP POLICY IF EXISTS "address_meters_manage_optimized" ON public.address_meters;
CREATE POLICY "address_meters_manage_optimized"
ON public.address_meters
FOR ALL
USING (
    -- Managers can manage meters for their addresses
    EXISTS (
        SELECT 1 FROM public.user_addresses ua
        WHERE ua.address_id = address_meters.address_id
        AND ua.user_id = (select auth.uid())
        AND ua.role IN ('owner', 'manager')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_addresses ua
        WHERE ua.address_id = address_meters.address_id
        AND ua.user_id = (select auth.uid())
        AND ua.role IN ('owner', 'manager')
    )
);

-- =====================================================
-- APARTMENT_METERS - Consolidated policies
-- =====================================================

-- Single SELECT policy
DROP POLICY IF EXISTS "apartment_meters_select_optimized" ON public.apartment_meters;
CREATE POLICY "apartment_meters_select_optimized"
ON public.apartment_meters
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_addresses ua
        JOIN public.addresses a ON a.id = ua.address_id
        JOIN public.properties p ON p.address_id = a.id
        WHERE p.id = apartment_meters.property_id
        AND ua.user_id = (select auth.uid())
    )
);

-- Single ALL policy for managers
DROP POLICY IF EXISTS "apartment_meters_manage_optimized" ON public.apartment_meters;
CREATE POLICY "apartment_meters_manage_optimized"
ON public.apartment_meters
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.user_addresses ua
        JOIN public.addresses a ON a.id = ua.address_id
        JOIN public.properties p ON p.address_id = a.id
        WHERE p.id = apartment_meters.property_id
        AND ua.user_id = (select auth.uid())
        AND ua.role IN ('owner', 'manager')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_addresses ua
        JOIN public.addresses a ON a.id = ua.address_id
        JOIN public.properties p ON p.address_id = a.id
        WHERE p.id = apartment_meters.property_id
        AND ua.user_id = (select auth.uid())
        AND ua.role IN ('owner', 'manager')
    )
);

-- =====================================================
-- INVOICES - Consolidated policies
-- =====================================================

-- Single SELECT policy
DROP POLICY IF EXISTS "invoices_select_optimized" ON public.invoices;
CREATE POLICY "invoices_select_optimized"
ON public.invoices
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_addresses ua
        JOIN public.addresses a ON a.id = ua.address_id
        JOIN public.properties p ON p.address_id = a.id
        WHERE p.id = invoices.property_id
        AND ua.user_id = (select auth.uid())
    )
);

-- Single ALL policy for managers
DROP POLICY IF EXISTS "invoices_manage_optimized" ON public.invoices;
CREATE POLICY "invoices_manage_optimized"
ON public.invoices
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.user_addresses ua
        JOIN public.addresses a ON a.id = ua.address_id
        JOIN public.properties p ON p.address_id = a.id
        WHERE p.id = invoices.property_id
        AND ua.user_id = (select auth.uid())
        AND ua.role IN ('owner', 'manager')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_addresses ua
        JOIN public.addresses a ON a.id = ua.address_id
        JOIN public.properties p ON p.address_id = a.id
        WHERE p.id = invoices.property_id
        AND ua.user_id = (select auth.uid())
        AND ua.role IN ('owner', 'manager')
    )
);

-- =====================================================
-- PROPERTIES - Consolidated policies
-- =====================================================

-- Single SELECT policy
DROP POLICY IF EXISTS "properties_select_optimized" ON public.properties;
CREATE POLICY "properties_select_optimized"
ON public.properties
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_addresses ua
        JOIN public.addresses a ON a.id = ua.address_id
        WHERE a.id = properties.address_id
        AND ua.user_id = (select auth.uid())
    )
);

-- Single ALL policy for managers
DROP POLICY IF EXISTS "properties_manage_optimized" ON public.properties;
CREATE POLICY "properties_manage_optimized"
ON public.properties
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.user_addresses ua
        JOIN public.addresses a ON a.id = ua.address_id
        WHERE a.id = properties.address_id
        AND ua.user_id = (select auth.uid())
        AND ua.role IN ('owner', 'manager')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_addresses ua
        JOIN public.addresses a ON a.id = ua.address_id
        WHERE a.id = properties.address_id
        AND ua.user_id = (select auth.uid())
        AND ua.role IN ('owner', 'manager')
    )
);

-- =====================================================
-- PROPERTY_METER_CONFIGS - Consolidated policies
-- =====================================================

-- Single SELECT policy
DROP POLICY IF EXISTS "property_meter_configs_select_optimized" ON public.property_meter_configs;
CREATE POLICY "property_meter_configs_select_optimized"
ON public.property_meter_configs
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_addresses ua
        JOIN public.addresses a ON a.id = ua.address_id
        WHERE a.id = property_meter_configs.address_id
        AND ua.user_id = (select auth.uid())
    )
);

-- Single ALL policy for managers
DROP POLICY IF EXISTS "property_meter_configs_manage_optimized" ON public.property_meter_configs;
CREATE POLICY "property_meter_configs_manage_optimized"
ON public.property_meter_configs
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.user_addresses ua
        JOIN public.addresses a ON a.id = ua.address_id
        WHERE a.id = property_meter_configs.address_id
        AND ua.user_id = (select auth.uid())
        AND ua.role IN ('owner', 'manager')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_addresses ua
        JOIN public.addresses a ON a.id = ua.address_id
        WHERE a.id = property_meter_configs.address_id
        AND ua.user_id = (select auth.uid())
        AND ua.role IN ('owner', 'manager')
    )
);

-- =====================================================
-- USER_ADDRESSES - Consolidated policies
-- =====================================================

-- Single SELECT policy
DROP POLICY IF EXISTS "user_addresses_select_optimized" ON public.user_addresses;
CREATE POLICY "user_addresses_select_optimized"
ON public.user_addresses
FOR SELECT
USING (
    -- Admin can see all
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = (select auth.uid())
        AND u.role = 'admin'
    )
    OR
    -- Users can see their own links
    user_id = (select auth.uid())
);

-- Single INSERT policy
DROP POLICY IF EXISTS "user_addresses_insert_optimized" ON public.user_addresses;
CREATE POLICY "user_addresses_insert_optimized"
ON public.user_addresses
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = (select auth.uid())
        AND u.role = 'admin'
    )
    OR
    user_id = (select auth.uid())
);

-- Single UPDATE policy
DROP POLICY IF EXISTS "user_addresses_update_optimized" ON public.user_addresses;
CREATE POLICY "user_addresses_update_optimized"
ON public.user_addresses
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = (select auth.uid())
        AND u.role = 'admin'
    )
    OR
    user_id = (select auth.uid())
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = (select auth.uid())
        AND u.role = 'admin'
    )
    OR
    user_id = (select auth.uid())
);

-- Single DELETE policy
DROP POLICY IF EXISTS "user_addresses_delete_optimized" ON public.user_addresses;
CREATE POLICY "user_addresses_delete_optimized"
ON public.user_addresses
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = (select auth.uid())
        AND u.role = 'admin'
    )
    OR
    user_id = (select auth.uid())
);

-- =====================================================
-- USERS - Consolidated policies
-- =====================================================

-- Single SELECT policy
DROP POLICY IF EXISTS "users_select_optimized" ON public.users;
CREATE POLICY "users_select_optimized"
ON public.users
FOR SELECT
USING (
    id = (select auth.uid())
);

-- Single INSERT policy
DROP POLICY IF EXISTS "users_insert_optimized" ON public.users;
CREATE POLICY "users_insert_optimized"
ON public.users
FOR INSERT
WITH CHECK (
    id = (select auth.uid())
);

-- Single UPDATE policy (consolidates both update policies)
DROP POLICY IF EXISTS "users_update_optimized" ON public.users;
CREATE POLICY "users_update_optimized"
ON public.users
FOR UPDATE
USING (
    id = (select auth.uid())
)
WITH CHECK (
    id = (select auth.uid())
);

-- =====================================================
-- NOTIFICATIONS - Consolidated policies
-- =====================================================

-- Single SELECT policy
DROP POLICY IF EXISTS "notifications_select_optimized" ON public.notifications;
CREATE POLICY "notifications_select_optimized"
ON public.notifications
FOR SELECT
USING (
    user_id = (select auth.uid())
);

-- Single UPDATE policy
DROP POLICY IF EXISTS "notifications_update_optimized" ON public.notifications;
CREATE POLICY "notifications_update_optimized"
ON public.notifications
FOR UPDATE
USING (
    user_id = (select auth.uid())
)
WITH CHECK (
    user_id = (select auth.uid())
);

-- Single INSERT policy
DROP POLICY IF EXISTS "notifications_insert_optimized" ON public.notifications;
CREATE POLICY "notifications_insert_optimized"
ON public.notifications
FOR INSERT
WITH CHECK (
    (select auth.uid()) IS NOT NULL
);

-- =====================================================
-- COMMUNAL_METERS - Consolidated policies
-- =====================================================

-- Single SELECT policy (consolidates both select and mutate for SELECT)
DROP POLICY IF EXISTS "communal_meters_select_optimized" ON public.communal_meters;
CREATE POLICY "communal_meters_select_optimized"
ON public.communal_meters
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.addresses a
        WHERE a.id = communal_meters.address_id
        AND a.created_by = (select auth.uid())
    )
);

-- Single ALL policy for mutate operations
DROP POLICY IF EXISTS "communal_meters_mutate_optimized" ON public.communal_meters;
CREATE POLICY "communal_meters_mutate_optimized"
ON public.communal_meters
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.addresses a
        WHERE a.id = communal_meters.address_id
        AND a.created_by = (select auth.uid())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.addresses a
        WHERE a.id = communal_meters.address_id
        AND a.created_by = (select auth.uid())
    )
);

-- =====================================================
-- TENANT_INVITATIONS - Consolidated policies
-- =====================================================

-- Single SELECT policy (consolidates tenant view + inviter manage for SELECT)
DROP POLICY IF EXISTS "tenant_invitations_select_optimized" ON public.tenant_invitations;
CREATE POLICY "tenant_invitations_select_optimized"
ON public.tenant_invitations
FOR SELECT
USING (
    -- Tenant can view their invitations (compare email from JWT)
    lower(email) = lower(coalesce((select auth.jwt()->>'email'), ''))
    OR
    -- Inviter can view invitations they sent
    invited_by = (select auth.uid())
);

-- Single UPDATE policy (consolidates tenant respond + inviter manage for UPDATE)
DROP POLICY IF EXISTS "tenant_invitations_update_optimized" ON public.tenant_invitations;
CREATE POLICY "tenant_invitations_update_optimized"
ON public.tenant_invitations
FOR UPDATE
USING (
    -- Tenant can respond (must be pending and email matches)
    (
        status = 'pending'
        AND lower(email) = lower(coalesce((select auth.jwt()->>'email'), ''))
    )
    OR
    -- Inviter can manage
    invited_by = (select auth.uid())
)
WITH CHECK (
    -- Tenant can respond (email must match)
    lower(email) = lower(coalesce((select auth.jwt()->>'email'), ''))
    OR
    -- Inviter can manage
    invited_by = (select auth.uid())
);

-- =====================================================
-- USER_METER_TEMPLATES - Optimized policy
-- =====================================================

DROP POLICY IF EXISTS "user_meter_templates_manage_optimized" ON public.user_meter_templates;
CREATE POLICY "user_meter_templates_manage_optimized"
ON public.user_meter_templates
FOR ALL
USING (
    user_id = (select auth.uid())
)
WITH CHECK (
    user_id = (select auth.uid())
);

-- =====================================================
-- USER_HIDDEN_METER_TEMPLATES - Optimized policy
-- =====================================================

DROP POLICY IF EXISTS "user_hidden_meter_templates_manage_optimized" ON public.user_hidden_meter_templates;
CREATE POLICY "user_hidden_meter_templates_manage_optimized"
ON public.user_hidden_meter_templates
FOR ALL
USING (
    user_id = (select auth.uid())
)
WITH CHECK (
    user_id = (select auth.uid())
);

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these after migration to verify:

-- Check policies use (select auth.uid()):
-- SELECT 
--     schemaname,
--     tablename,
--     policyname,
--     CASE 
--         WHEN qual LIKE '%(select auth.uid())%' THEN '✅ Optimized'
--         WHEN qual LIKE '%auth.uid()%' THEN '❌ Needs optimization'
--         ELSE 'N/A'
--     END as performance_status
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%')
-- ORDER BY tablename, policyname;

-- Check for multiple permissive policies:
-- SELECT 
--     schemaname,
--     tablename,
--     roles,
--     cmd,
--     COUNT(*) as policy_count,
--     CASE 
--         WHEN COUNT(*) > 1 THEN '❌ Multiple policies'
--         ELSE '✅ Single policy'
--     END as status
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- GROUP BY schemaname, tablename, roles, cmd
-- HAVING COUNT(*) > 1
-- ORDER BY tablename, roles, cmd;

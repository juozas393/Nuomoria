-- =====================================================
-- Fix Address Meters RLS Policy
-- =====================================================
-- Issue: Trigger creates user_addresses with role 'landlord'
-- but RLS policies only check for 'owner' or 'manager'
-- 
-- Solution: Add 'landlord' to the allowed roles in RLS policies
-- =====================================================

BEGIN;

-- =====================================================
-- 1. Fix ADDRESS_METERS policy
-- =====================================================
DROP POLICY IF EXISTS "address_meters_manage_optimized" ON public.address_meters;

CREATE POLICY "address_meters_manage_optimized"
ON public.address_meters
FOR ALL
USING (
    -- Managers/Owners/Landlords can manage meters for their addresses
    EXISTS (
        SELECT 1 FROM public.user_addresses ua
        WHERE ua.address_id = address_meters.address_id
        AND ua.user_id = (select auth.uid())
        AND ua.role IN ('owner', 'manager', 'landlord')  -- Added 'landlord'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_addresses ua
        WHERE ua.address_id = address_meters.address_id
        AND ua.user_id = (select auth.uid())
        AND ua.role IN ('owner', 'manager', 'landlord')  -- Added 'landlord'
    )
);

-- =====================================================
-- 2. Fix APARTMENT_METERS policy
-- =====================================================
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
        AND ua.role IN ('owner', 'manager', 'landlord')  -- Added 'landlord'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_addresses ua
        JOIN public.addresses a ON a.id = ua.address_id
        JOIN public.properties p ON p.address_id = a.id
        WHERE p.id = apartment_meters.property_id
        AND ua.user_id = (select auth.uid())
        AND ua.role IN ('owner', 'manager', 'landlord')  -- Added 'landlord'
    )
);

-- =====================================================
-- 3. Fix PROPERTIES policy
-- =====================================================
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
        AND ua.role IN ('owner', 'manager', 'landlord')  -- Added 'landlord'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_addresses ua
        JOIN public.addresses a ON a.id = ua.address_id
        WHERE a.id = properties.address_id
        AND ua.user_id = (select auth.uid())
        AND ua.role IN ('owner', 'manager', 'landlord')  -- Added 'landlord'
    )
);

-- =====================================================
-- 4. Fix PROPERTY_METER_CONFIGS policy
-- =====================================================
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
        AND ua.role IN ('owner', 'manager', 'landlord')  -- Added 'landlord'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_addresses ua
        JOIN public.addresses a ON a.id = ua.address_id
        WHERE a.id = property_meter_configs.address_id
        AND ua.user_id = (select auth.uid())
        AND ua.role IN ('owner', 'manager', 'landlord')  -- Added 'landlord'
    )
);

-- =====================================================
-- 5. Fix INVOICES policy
-- =====================================================
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
        AND ua.role IN ('owner', 'manager', 'landlord')  -- Added 'landlord'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_addresses ua
        JOIN public.addresses a ON a.id = ua.address_id
        JOIN public.properties p ON p.address_id = a.id
        WHERE p.id = invoices.property_id
        AND ua.user_id = (select auth.uid())
        AND ua.role IN ('owner', 'manager', 'landlord')  -- Added 'landlord'
    )
);

-- =====================================================
-- 6. Fix ADDRESSES UPDATE policy
-- =====================================================
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
        AND ua.role IN ('owner', 'manager', 'landlord')  -- Added 'landlord'
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
        AND ua.role IN ('owner', 'manager', 'landlord')  -- Added 'landlord'
    )
    OR
    created_by = (select auth.uid())
);

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the fix:
-- 
-- 1. Check policies have been updated:
-- SELECT policyname, qual 
-- FROM pg_policies 
-- WHERE tablename = 'address_meters' 
-- AND policyname LIKE '%manage%';
--
-- 2. Verify 'landlord' is in the policy:
-- SELECT policyname, qual 
-- FROM pg_policies 
-- WHERE qual LIKE '%landlord%';

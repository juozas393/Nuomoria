-- Allow tenants to read address_meters for addresses they are assigned to
-- The existing policy "address_meters_manage_optimized" only allows owner/manager/landlord roles
-- Tenants need read access to see meter configs when submitting readings

DROP POLICY IF EXISTS "address_meters_tenant_read" ON public.address_meters;
CREATE POLICY "address_meters_tenant_read" ON public.address_meters
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_addresses ua
            WHERE ua.address_id = address_meters.address_id
            AND ua.user_id = auth.uid()
            AND ua.role = 'tenant'
        )
    );

-- ROLLBACK: DROP POLICY IF EXISTS "address_meters_tenant_read" ON public.address_meters;

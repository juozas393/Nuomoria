-- =====================================================
-- FINAL FIX: Add remaining RLS for tenant dashboard
-- Run this in Supabase Staging SQL Editor
-- =====================================================

-- tenant_invitations (critical for tenant dashboard)
ALTER TABLE IF EXISTS public.tenant_invitations ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.tenant_invitations TO authenticated;

DROP POLICY IF EXISTS "tenant_invitations_select" ON public.tenant_invitations;
DROP POLICY IF EXISTS "tenant_invitations_insert" ON public.tenant_invitations;
DROP POLICY IF EXISTS "tenant_invitations_update" ON public.tenant_invitations;
DROP POLICY IF EXISTS "tenant_invitations_delete" ON public.tenant_invitations;

-- Tenants can see invitations sent TO their email, landlords see invitations they sent
CREATE POLICY "tenant_invitations_select" ON public.tenant_invitations 
  FOR SELECT USING (
    lower(email) = lower(COALESCE(auth.jwt() ->> 'email', '')) 
    OR invited_by = auth.uid()
  );

CREATE POLICY "tenant_invitations_insert" ON public.tenant_invitations 
  FOR INSERT WITH CHECK (invited_by = auth.uid());

CREATE POLICY "tenant_invitations_update" ON public.tenant_invitations 
  FOR UPDATE USING (
    (status = 'pending' AND lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))) 
    OR invited_by = auth.uid()
  );

CREATE POLICY "tenant_invitations_delete" ON public.tenant_invitations 
  FOR DELETE USING (invited_by = auth.uid());

-- properties (needed for tenant to see their rented property)
ALTER TABLE IF EXISTS public.properties ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.properties TO authenticated;

DROP POLICY IF EXISTS "properties_select_linked" ON public.properties;
DROP POLICY IF EXISTS "properties_manage_linked" ON public.properties;

-- Allow users to see properties they have access to via user_addresses OR via accepted invitation
CREATE POLICY "properties_select" ON public.properties 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_addresses ua 
      JOIN addresses a ON a.id = ua.address_id 
      WHERE a.id = properties.address_id AND ua.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM tenant_invitations ti
      WHERE ti.property_id = properties.id
      AND ti.status = 'accepted'
      AND lower(ti.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
    )
  );

-- invoices
ALTER TABLE IF EXISTS public.invoices ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.invoices TO authenticated;

DROP POLICY IF EXISTS "invoices_select" ON public.invoices;
DROP POLICY IF EXISTS "invoices_manage" ON public.invoices;

CREATE POLICY "invoices_select" ON public.invoices 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_addresses ua 
      JOIN addresses a ON a.id = ua.address_id 
      JOIN properties p ON p.address_id = a.id
      WHERE p.id = invoices.property_id AND ua.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM tenant_invitations ti
      WHERE ti.property_id = invoices.property_id
      AND ti.status = 'accepted'
      AND lower(ti.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
    )
  );

SELECT 'Tenant dashboard RLS complete!' as status;

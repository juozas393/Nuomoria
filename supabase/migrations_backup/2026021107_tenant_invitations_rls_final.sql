-- Final cleanup: Tenant invitations RLS policies with InitPlan optimization
-- These policies use (SELECT auth.uid()) and (SELECT auth.email()) patterns for performance
-- Replaces all previous tenant_invitations policies

DROP POLICY IF EXISTS "tenant_invitations_select" ON tenant_invitations;
DROP POLICY IF EXISTS "tenant_invitations_insert" ON tenant_invitations;
DROP POLICY IF EXISTS "tenant_invitations_update" ON tenant_invitations;
DROP POLICY IF EXISTS "tenant_invitations_delete" ON tenant_invitations;
DROP POLICY IF EXISTS "tenant_invitations_select_optimized" ON tenant_invitations;
DROP POLICY IF EXISTS "tenant_invitations_insert_optimized" ON tenant_invitations;
DROP POLICY IF EXISTS "tenant_invitations_update_optimized" ON tenant_invitations;
DROP POLICY IF EXISTS "tenant_invitations_delete_optimized" ON tenant_invitations;

-- SELECT: tenant can see their invitations (by email), landlord can see ones they sent, any authenticated can see pending
CREATE POLICY "tenant_invitations_select_optimized" ON tenant_invitations
  FOR SELECT USING (
    lower(email) = lower((SELECT auth.email()))
    OR invited_by = (SELECT auth.uid())
    OR (status = 'pending' AND (SELECT auth.uid()) IS NOT NULL)
  );

-- INSERT: only the landlord (invited_by = self)
CREATE POLICY "tenant_invitations_insert_optimized" ON tenant_invitations
  FOR INSERT WITH CHECK (invited_by = (SELECT auth.uid()));

-- UPDATE: pending invitations can be updated by any authenticated user (tenant accepting), or by landlord
CREATE POLICY "tenant_invitations_update_optimized" ON tenant_invitations
  FOR UPDATE
  USING (
    (status = 'pending' AND (SELECT auth.uid()) IS NOT NULL)
    OR invited_by = (SELECT auth.uid())
  )
  WITH CHECK (
    lower(email) = lower((SELECT auth.email()))
    OR invited_by = (SELECT auth.uid())
  );

-- DELETE: only the landlord who sent it
CREATE POLICY "tenant_invitations_delete_optimized" ON tenant_invitations
  FOR DELETE USING (invited_by = (SELECT auth.uid()));

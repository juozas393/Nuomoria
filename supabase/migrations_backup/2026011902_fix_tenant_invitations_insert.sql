-- Fix missing INSERT policy for tenant_invitations
-- The optimized RLS migration only had SELECT and UPDATE, missing INSERT

-- Add INSERT policy for tenant_invitations
DROP POLICY IF EXISTS "tenant_invitations_insert_optimized" ON public.tenant_invitations;
CREATE POLICY "tenant_invitations_insert_optimized"
ON public.tenant_invitations
FOR INSERT
WITH CHECK (
    -- Users can create invitations (invited_by must match their uid)
    invited_by = (select auth.uid())
);

-- Also add DELETE policy for landlords to manage/cancel invitations
DROP POLICY IF EXISTS "tenant_invitations_delete_optimized" ON public.tenant_invitations;
CREATE POLICY "tenant_invitations_delete_optimized"
ON public.tenant_invitations
FOR DELETE
USING (
    -- Inviter can delete their invitations
    invited_by = (select auth.uid())
);

-- FIX: Update SELECT policy to allow ANY authenticated user to find pending invitations
-- This is needed for joinByCode to work (tenant searches by token)
DROP POLICY IF EXISTS "tenant_invitations_select_optimized" ON public.tenant_invitations;
CREATE POLICY "tenant_invitations_select_optimized"
ON public.tenant_invitations
FOR SELECT
USING (
    -- Tenant can view their invitations (by email match)
    lower(email) = lower(coalesce((select auth.jwt()->>'email'), ''))
    OR
    -- Inviter can view invitations they sent
    invited_by = (select auth.uid())
    OR
    -- ANY authenticated user can view PENDING invitations (for joinByCode lookup)
    -- They will filter by token in application code
    (status = 'pending' AND (select auth.uid()) IS NOT NULL)
);

-- FIX: Update UPDATE policy to allow any authenticated user to accept pending invitations
DROP POLICY IF EXISTS "tenant_invitations_update_optimized" ON public.tenant_invitations;
CREATE POLICY "tenant_invitations_update_optimized"
ON public.tenant_invitations
FOR UPDATE
USING (
    -- Tenant can respond (must be pending - any authenticated user can update pending)
    (status = 'pending' AND (select auth.uid()) IS NOT NULL)
    OR
    -- Inviter can manage
    invited_by = (select auth.uid())
)
WITH CHECK (
    -- After update: email must match the user OR inviter manages
    lower(email) = lower(coalesce((select auth.jwt()->>'email'), ''))
    OR
    invited_by = (select auth.uid())
);

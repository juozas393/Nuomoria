-- RLS Policy Cleanup and InitPlan Fix
-- Optimizes RLS policies to use (SELECT auth.uid()) pattern (InitPlan) instead of auth.uid() directly
-- This avoids re-evaluating auth.uid() for every row and significantly improves query performance

-- Optimize properties policy
DROP POLICY IF EXISTS "properties_manage_optimized" ON properties;
CREATE POLICY "properties_manage_optimized" ON properties
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_addresses ua
      JOIN addresses a ON a.id = ua.address_id
      WHERE a.id = properties.address_id
        AND ua.user_id = (SELECT auth.uid())
        AND ua.role IN ('owner', 'manager', 'landlord')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_addresses ua
      JOIN addresses a ON a.id = ua.address_id
      WHERE a.id = properties.address_id
        AND ua.user_id = (SELECT auth.uid())
        AND ua.role IN ('owner', 'manager', 'landlord')
    )
  );

-- Optimize invoices policy
DROP POLICY IF EXISTS "invoices_manage_optimized" ON invoices;
CREATE POLICY "invoices_manage_optimized" ON invoices
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_addresses ua
      JOIN addresses a ON a.id = ua.address_id
      JOIN properties p ON p.address_id = a.id
      WHERE p.id = invoices.property_id
        AND ua.user_id = (SELECT auth.uid())
        AND ua.role IN ('owner', 'manager', 'landlord')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_addresses ua
      JOIN addresses a ON a.id = ua.address_id
      JOIN properties p ON p.address_id = a.id
      WHERE p.id = invoices.property_id
        AND ua.user_id = (SELECT auth.uid())
        AND ua.role IN ('owner', 'manager', 'landlord')
    )
  );

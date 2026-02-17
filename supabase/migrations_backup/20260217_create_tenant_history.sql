-- Create tenant_history table for tracking past tenants
-- This stores historical tenant information for each property

CREATE TABLE IF NOT EXISTS tenant_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenant_name text NOT NULL,
  tenant_email text,
  tenant_phone text,
  rent numeric(10,2),
  contract_start date,
  contract_end date,
  end_reason text CHECK (end_reason IN ('expired', 'moved_out', 'evicted', 'mutual', 'other')),
  notes text,
  created_at timestamptz DEFAULT timezone('utc', now())
);

-- Enable RLS
ALTER TABLE tenant_history ENABLE ROW LEVEL SECURITY;

-- RLS: Landlords can manage tenant history for their properties
DROP POLICY IF EXISTS "tenant_history_manage" ON tenant_history;
CREATE POLICY "tenant_history_manage" ON tenant_history
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN user_addresses ua ON ua.address_id = p.address_id
      WHERE p.id = tenant_history.property_id
        AND ua.user_id = auth.uid()
        AND ua.role IN ('owner', 'manager', 'landlord')
    )
  );

-- Grant access
GRANT ALL ON tenant_history TO authenticated;
GRANT ALL ON tenant_history TO service_role;

-- ROLLBACK: DROP TABLE IF EXISTS tenant_history;

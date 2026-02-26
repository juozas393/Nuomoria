-- =============================================================================
-- MIGRATION: tenant_history (IDEMPOTENT — table may already exist)
-- Track tenant occupancy per apartment
-- =============================================================================

-- Table
CREATE TABLE IF NOT EXISTS tenant_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenant_name text NOT NULL,
  tenant_email text,
  tenant_phone text,
  rent numeric(10,2),
  contract_start date,
  contract_end date,
  end_reason text,
  notes text,
  created_at timestamptz DEFAULT now()
);
-- ROLLBACK: DROP TABLE IF EXISTS tenant_history;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tenant_history_property ON tenant_history(property_id);
CREATE INDEX IF NOT EXISTS idx_tenant_history_created ON tenant_history(created_at);

-- RLS
ALTER TABLE tenant_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Landlord can view tenant history" ON tenant_history;
CREATE POLICY "Landlord can view tenant history" ON tenant_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN addresses a ON a.id = p.address_id
      WHERE p.id = tenant_history.property_id AND a.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Landlord can insert tenant history" ON tenant_history;
CREATE POLICY "Landlord can insert tenant history" ON tenant_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN addresses a ON a.id = p.address_id
      WHERE p.id = tenant_history.property_id AND a.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Landlord can update tenant history" ON tenant_history;
CREATE POLICY "Landlord can update tenant history" ON tenant_history
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN addresses a ON a.id = p.address_id
      WHERE p.id = tenant_history.property_id AND a.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Landlord can delete tenant history" ON tenant_history;
CREATE POLICY "Landlord can delete tenant history" ON tenant_history
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN addresses a ON a.id = p.address_id
      WHERE p.id = tenant_history.property_id AND a.owner_id = auth.uid()
    )
  );

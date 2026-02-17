-- Create property_documents table for the Istorija (History) tab
-- Stores uploaded documents associated with properties

CREATE TABLE IF NOT EXISTS property_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'other',
  file_name text NOT NULL,
  file_size bigint,
  mime_type text,
  storage_path text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE property_documents ENABLE ROW LEVEL SECURITY;

-- Landlords can manage all documents for their properties
DROP POLICY IF EXISTS "landlord_manage_documents" ON property_documents;
CREATE POLICY "landlord_manage_documents" ON property_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN user_addresses ua ON ua.address_id = p.address_id
      WHERE p.id = property_documents.property_id
        AND ua.user_id = auth.uid()
    )
  );

-- Tenants can view documents for their rented property
DROP POLICY IF EXISTS "tenant_view_documents" ON property_documents;
CREATE POLICY "tenant_view_documents" ON property_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tenants t
      WHERE t.property_id = property_documents.property_id
        AND t.user_id = auth.uid()
    )
  );

GRANT ALL ON property_documents TO authenticated;
GRANT ALL ON property_documents TO service_role;

-- ROLLBACK: DROP TABLE IF EXISTS property_documents;

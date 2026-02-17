-- Enhance invoices table with payment tracking columns
-- Add new columns for period tracking, late fees, line items

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS period_start date;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS period_end date;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS late_fee numeric DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS line_items jsonb DEFAULT '[]'::jsonb;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS address_id uuid REFERENCES addresses(id) ON DELETE SET NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS other_amount numeric DEFAULT 0;

-- Ensure status constraint matches
DO $$ BEGIN
  ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
  ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
    CHECK (status IN ('paid', 'unpaid', 'overdue', 'cancelled'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Ensure payment_method constraint
DO $$ BEGIN
  ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_payment_method_check;
  ALTER TABLE invoices ADD CONSTRAINT invoices_payment_method_check
    CHECK (payment_method IN ('cash', 'bank_transfer', 'card', 'check'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- RLS: tenants can view their own invoices
DROP POLICY IF EXISTS "tenants_view_own_invoices" ON invoices;
CREATE POLICY "tenants_view_own_invoices" ON invoices
  FOR SELECT USING (tenant_id = auth.uid());

-- Create invoice_payments table
CREATE TABLE IF NOT EXISTS invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount >= 0),
  payment_method text CHECK (payment_method IN ('cash', 'bank_transfer', 'card', 'check', 'other')),
  paid_at date NOT NULL DEFAULT (timezone('utc', now()))::date,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoice_payments_manage" ON invoice_payments;
CREATE POLICY "invoice_payments_manage" ON invoice_payments
  FOR ALL USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "landlords_manage_payments" ON invoice_payments;
CREATE POLICY "landlords_manage_payments" ON invoice_payments
  FOR ALL USING (
    invoice_id IN (
      SELECT i.id FROM invoices i
      JOIN properties p ON p.id = i.property_id
      JOIN addresses a ON a.id = p.address_id
      JOIN user_addresses ua ON ua.address_id = a.id
      WHERE ua.user_id = auth.uid()
        AND ua.role IN ('owner', 'manager', 'landlord')
    )
  ) WITH CHECK (
    invoice_id IN (
      SELECT i.id FROM invoices i
      JOIN properties p ON p.id = i.property_id
      JOIN addresses a ON a.id = p.address_id
      JOIN user_addresses ua ON ua.address_id = a.id
      WHERE ua.user_id = auth.uid()
        AND ua.role IN ('owner', 'manager', 'landlord')
    )
  );

DROP POLICY IF EXISTS "tenants_view_own_payments" ON invoice_payments;
CREATE POLICY "tenants_view_own_payments" ON invoice_payments
  FOR SELECT USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE tenant_id = auth.uid()
    )
  );

GRANT ALL ON invoice_payments TO authenticated;
GRANT ALL ON invoice_payments TO service_role;

-- Create property_deposit_events table
CREATE TABLE IF NOT EXISTS property_deposit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('received', 'adjustment', 'refund')),
  amount numeric NOT NULL,
  balance_after numeric,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE property_deposit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deposit_events_manage" ON property_deposit_events;
CREATE POLICY "deposit_events_manage" ON property_deposit_events
  FOR ALL USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

GRANT ALL ON property_deposit_events TO authenticated;
GRANT ALL ON property_deposit_events TO service_role;

-- ROLLBACK:
-- DROP TABLE IF EXISTS property_deposit_events;
-- DROP TABLE IF EXISTS invoice_payments;
-- ALTER TABLE invoices DROP COLUMN IF EXISTS period_start;
-- ALTER TABLE invoices DROP COLUMN IF EXISTS period_end;
-- ALTER TABLE invoices DROP COLUMN IF EXISTS late_fee;
-- ALTER TABLE invoices DROP COLUMN IF EXISTS line_items;
-- ALTER TABLE invoices DROP COLUMN IF EXISTS tenant_id;
-- ALTER TABLE invoices DROP COLUMN IF EXISTS address_id;
-- ALTER TABLE invoices DROP COLUMN IF EXISTS other_amount;

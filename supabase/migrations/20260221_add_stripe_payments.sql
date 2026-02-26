-- ============================================================
-- Stripe Connect + Payments tables
-- ROLLBACK: DROP TABLE IF EXISTS payments; DROP TABLE IF EXISTS stripe_accounts;
-- ============================================================

-- 1. stripe_accounts — maps landlord users to Stripe Connect accounts
CREATE TABLE IF NOT EXISTS stripe_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'restricted', 'disabled')),
  charges_enabled BOOLEAN NOT NULL DEFAULT false,
  payouts_enabled BOOLEAN NOT NULL DEFAULT false,
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  details_submitted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick lookup by user_id
CREATE INDEX IF NOT EXISTS idx_stripe_accounts_user_id ON stripe_accounts(user_id);

-- RLS
ALTER TABLE stripe_accounts ENABLE ROW LEVEL SECURITY;

-- Landlord can read their own Stripe account
DROP POLICY IF EXISTS "stripe_accounts_select_own" ON stripe_accounts;
CREATE POLICY "stripe_accounts_select_own" ON stripe_accounts
  FOR SELECT USING (user_id = app_user_id());

-- Tenants can check if a landlord has Stripe enabled (for showing pay button)
-- They can see charges_enabled for any property they have access to
DROP POLICY IF EXISTS "stripe_accounts_select_tenant" ON stripe_accounts;
CREATE POLICY "stripe_accounts_select_tenant" ON stripe_accounts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_addresses ua
      JOIN user_addresses la ON la.address_id = ua.address_id AND la.user_id = stripe_accounts.user_id
      WHERE ua.user_id = app_user_id()
    )
  );

-- Service role handles inserts/updates (via Edge Functions)
-- No direct insert/update policies for authenticated users

-- 2. payments — records of all Stripe payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
  tenant_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  landlord_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_charge_id TEXT,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  stripe_fee NUMERIC(10,2),
  currency TEXT NOT NULL DEFAULT 'eur',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'refunded', 'cancelled')),
  payment_method TEXT DEFAULT 'sepa_debit'
    CHECK (payment_method IN ('sepa_debit', 'card', 'manual')),
  description TEXT,
  paid_at TIMESTAMPTZ,
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_user_id);
CREATE INDEX IF NOT EXISTS idx_payments_landlord ON payments(landlord_user_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_property ON payments(property_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_pi ON payments(stripe_payment_intent_id);

-- RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Tenant can see their own payments
DROP POLICY IF EXISTS "payments_select_tenant" ON payments;
CREATE POLICY "payments_select_tenant" ON payments
  FOR SELECT USING (tenant_user_id = app_user_id());

-- Landlord can see payments for their properties
DROP POLICY IF EXISTS "payments_select_landlord" ON payments;
CREATE POLICY "payments_select_landlord" ON payments
  FOR SELECT USING (landlord_user_id = app_user_id());

-- Service role handles inserts/updates (via Edge Functions + webhooks)
-- No direct insert/update policies for authenticated users

-- 3. Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS stripe_accounts_updated_at ON stripe_accounts;
CREATE TRIGGER stripe_accounts_updated_at
  BEFORE UPDATE ON stripe_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS payments_updated_at ON payments;
CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

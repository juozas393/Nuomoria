-- Fix tenant_invitations.token column type and add expiry

-- 1. Change token from uuid to text (required for ILIKE prefix matching with invitation codes)
ALTER TABLE tenant_invitations ALTER COLUMN token TYPE text USING token::text;
ALTER TABLE tenant_invitations ALTER COLUMN token SET DEFAULT gen_random_uuid()::text;

-- 2. Add expires_at column (invitation codes expire after 12 hours)
ALTER TABLE tenant_invitations ADD COLUMN IF NOT EXISTS expires_at timestamptz 
  DEFAULT (timezone('utc', now()) + interval '12 hours');

-- Backfill: set expires_at for existing rows based on created_at
UPDATE tenant_invitations SET expires_at = created_at + interval '12 hours' WHERE expires_at IS NULL;

-- 3. Create trigger to auto-update property when invitation is accepted
-- This runs as SECURITY DEFINER so tenants can trigger property updates despite RLS
CREATE OR REPLACE FUNCTION handle_invitation_accepted()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status <> 'accepted') THEN
    UPDATE properties SET
      status = 'occupied',
      tenant_name = COALESCE(NEW.full_name, NEW.email),
      email = NEW.email,
      phone = NEW.phone,
      contract_start = COALESCE(NEW.contract_start, contract_start, CURRENT_DATE),
      contract_end = COALESCE(NEW.contract_end, contract_end, (CURRENT_DATE + interval '1 year')::date),
      rent = COALESCE(NEW.rent, rent),
      deposit_amount = COALESCE(NEW.deposit, deposit_amount)
    WHERE id = NEW.property_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_invitation_accepted ON tenant_invitations;
CREATE TRIGGER on_invitation_accepted
  AFTER UPDATE ON tenant_invitations
  FOR EACH ROW
  EXECUTE FUNCTION handle_invitation_accepted();

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- ROLLBACK:
-- DROP TRIGGER IF EXISTS on_invitation_accepted ON tenant_invitations;
-- DROP FUNCTION IF EXISTS handle_invitation_accepted();
-- ALTER TABLE tenant_invitations DROP COLUMN IF EXISTS expires_at;
-- ALTER TABLE tenant_invitations ALTER COLUMN token TYPE uuid USING token::uuid;

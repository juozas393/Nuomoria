-- ============================================================================
-- Migration: Add reserved status, under_maintenance flag, and auto-sync trigger
-- ============================================================================

-- 1. Expand CHECK constraint to include 'reserved'
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_status_check;
ALTER TABLE properties ADD CONSTRAINT properties_status_check
  CHECK (status::text = ANY (ARRAY['occupied','vacant','maintenance','reserved']));

-- 2. Add under_maintenance boolean column (independent maintenance flag)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS under_maintenance BOOLEAN DEFAULT false;

-- ROLLBACK: ALTER TABLE properties DROP COLUMN IF EXISTS under_maintenance;
-- ROLLBACK: ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_status_check;
-- ROLLBACK: ALTER TABLE properties ADD CONSTRAINT properties_status_check CHECK (status::text = ANY (ARRAY['occupied','vacant','maintenance']));

-- 3. Create auto-sync trigger function
-- Automatically transitions occupied↔vacant based on tenant_name changes
-- Does NOT touch 'reserved' or 'maintenance' status (landlord-controlled)
CREATE OR REPLACE FUNCTION sync_property_status_on_tenant_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Tenant assigned: vacant → occupied
  IF (OLD.tenant_name IS NULL OR OLD.tenant_name = '' OR OLD.tenant_name = 'Laisvas')
     AND NEW.tenant_name IS NOT NULL
     AND NEW.tenant_name <> ''
     AND NEW.tenant_name <> 'Laisvas'
     AND OLD.status = 'vacant'
  THEN
    NEW.status := 'occupied';
  END IF;

  -- Tenant removed: occupied → vacant
  IF (OLD.tenant_name IS NOT NULL AND OLD.tenant_name <> '' AND OLD.tenant_name <> 'Laisvas')
     AND (NEW.tenant_name IS NULL OR NEW.tenant_name = '' OR NEW.tenant_name = 'Laisvas')
     AND OLD.status = 'occupied'
  THEN
    NEW.status := 'vacant';
    -- Also clear maintenance flag when tenant leaves (clean state)
    NEW.under_maintenance := false;
  END IF;

  RETURN NEW;
END;
$function$;

-- 4. Create the trigger (BEFORE UPDATE so we modify the row in-flight)
DROP TRIGGER IF EXISTS on_tenant_status_sync ON properties;
CREATE TRIGGER on_tenant_status_sync
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION sync_property_status_on_tenant_change();

-- 5. Grant access
GRANT EXECUTE ON FUNCTION sync_property_status_on_tenant_change() TO authenticated;
GRANT EXECUTE ON FUNCTION sync_property_status_on_tenant_change() TO service_role;

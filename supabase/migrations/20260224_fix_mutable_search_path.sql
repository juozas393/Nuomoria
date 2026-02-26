-- ============================================================================
-- Migration: Fix mutable search_path security warnings
-- Fixes: handle_invitation_accepted, sync_property_status_on_tenant_change,
--        tenant_can_read_address, update_updated_at_column
-- ============================================================================

-- 1. handle_invitation_accepted — add SET search_path TO ''
CREATE OR REPLACE FUNCTION public.handle_invitation_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status <> 'accepted') THEN
    UPDATE public.properties SET
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
$$;

-- 2. sync_property_status_on_tenant_change — add SET search_path TO ''
CREATE OR REPLACE FUNCTION public.sync_property_status_on_tenant_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
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
    NEW.under_maintenance := false;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. tenant_can_read_address — use ALTER to set search_path (function may exist only in live DB)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'tenant_can_read_address' AND pronamespace = 'public'::regnamespace) THEN
    ALTER FUNCTION public.tenant_can_read_address SET search_path TO '';
  END IF;
END;
$$;

-- 4. update_updated_at_column — recreate with SET search_path TO ''
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

-- ROLLBACK:
-- ALTER FUNCTION public.handle_invitation_accepted RESET search_path;
-- ALTER FUNCTION public.sync_property_status_on_tenant_change RESET search_path;
-- ALTER FUNCTION public.tenant_can_read_address RESET search_path;
-- ALTER FUNCTION public.update_updated_at_column RESET search_path;

-- =============================================
-- STAGING TRIGGERS (from Production)
-- Run this in Supabase Staging SQL Editor
-- =============================================

-- =============================================
-- TRIGGER FUNCTIONS
-- =============================================

-- 1. update_updated_at_column - updates updated_at on row change
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2. update_conversation_timestamp - updates conversation when new message
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
begin
    update public.conversations 
    set updated_at = now() 
    where id = NEW.conversation_id;
    return NEW;
end;
$function$;

-- 3. set_updated_at - alternative updated_at setter
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

-- 4. trg_fn_addresses_set_created_by - auto-set created_by on addresses
CREATE OR REPLACE FUNCTION public.trg_fn_addresses_set_created_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
    -- Set created_by if not already set
    IF NEW.created_by IS NULL AND auth.uid() IS NOT NULL THEN
        NEW.created_by := auth.uid();
    END IF;
    RETURN NEW;
END;
$function$;

-- 5. trg_fn_addresses_autolink - auto-link user to address after creation
CREATE OR REPLACE FUNCTION public.trg_fn_addresses_autolink()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
    -- Only insert link if user_id is not null
    IF auth.uid() IS NOT NULL THEN
        INSERT INTO public.user_addresses (user_id, address_id, role, role_at_address, created_at)
        VALUES (auth.uid(), NEW.id, 'landlord', 'landlord', NOW())
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$function$;

-- =============================================
-- TRIGGERS
-- =============================================

-- on_new_message - update conversation timestamp when message is sent
DROP TRIGGER IF EXISTS on_new_message ON public.messages;
CREATE TRIGGER on_new_message
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_conversation_timestamp();

-- update_addresses_updated_at - auto-update addresses.updated_at
DROP TRIGGER IF EXISTS update_addresses_updated_at ON public.addresses;
CREATE TRIGGER update_addresses_updated_at
    BEFORE UPDATE ON public.addresses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- update_profiles_updated_at - auto-update profiles.updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- addresses_set_created_by_trigger - auto-set created_by when address created
DROP TRIGGER IF EXISTS addresses_set_created_by_trigger ON public.addresses;
CREATE TRIGGER addresses_set_created_by_trigger
    BEFORE INSERT ON public.addresses
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_fn_addresses_set_created_by();

-- addresses_autolink_trigger - auto-link user to address after creation
DROP TRIGGER IF EXISTS addresses_autolink_trigger ON public.addresses;
CREATE TRIGGER addresses_autolink_trigger
    AFTER INSERT ON public.addresses
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_fn_addresses_autolink();

-- =============================================
-- SUCCESS!
-- =============================================
SELECT 'Triggers added successfully!' as status;

-- =====================================================
-- Fix 403 error when inserting addresses
-- =====================================================
-- Issue: Trigger function exists but is not attached to addresses table
-- Also ensures RLS policies allow authenticated users to insert

BEGIN;

-- =====================================================
-- 1. Ensure trigger function exists and is correct
-- =====================================================
CREATE OR REPLACE FUNCTION public.trg_fn_addresses_autolink()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Only insert link if user_id is not null
    IF auth.uid() IS NOT NULL THEN
        INSERT INTO public.user_addresses (user_id, address_id, role, role_at_address, created_at)
        VALUES (auth.uid(), NEW.id, 'landlord', 'landlord', NOW())
        ON CONFLICT (user_id, address_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

-- =====================================================
-- 2. Ensure trigger function to set created_by exists
-- =====================================================
CREATE OR REPLACE FUNCTION public.trg_fn_addresses_set_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Set created_by if not already set
    IF NEW.created_by IS NULL AND auth.uid() IS NOT NULL THEN
        NEW.created_by := auth.uid();
    END IF;
    RETURN NEW;
END;
$$;

-- =====================================================
-- 3. Drop existing triggers if they exist
-- =====================================================
DROP TRIGGER IF EXISTS addresses_autolink_trigger ON public.addresses;
DROP TRIGGER IF EXISTS addresses_set_created_by_trigger ON public.addresses;

-- =====================================================
-- 4. Create triggers on addresses table
-- =====================================================
-- Trigger to set created_by before insert
DROP TRIGGER IF EXISTS addresses_set_created_by_trigger ON public.addresses;
CREATE TRIGGER addresses_set_created_by_trigger
    BEFORE INSERT ON public.addresses
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_fn_addresses_set_created_by();

-- Trigger to auto-link address to user after insert
DROP TRIGGER IF EXISTS addresses_autolink_trigger ON public.addresses;
CREATE TRIGGER addresses_autolink_trigger
    AFTER INSERT ON public.addresses
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_fn_addresses_autolink();

-- =====================================================
-- 5. Ensure RLS policy allows authenticated users to insert
-- =====================================================
-- Drop conflicting policies first
DROP POLICY IF EXISTS "addresses_insert_optimized" ON public.addresses;
DROP POLICY IF EXISTS "Authenticated users can insert addresses" ON public.addresses;

-- Create a single, clear INSERT policy
-- Priority: Check auth.uid() first (simpler, faster check)
DROP POLICY IF EXISTS "addresses_insert_optimized" ON public.addresses;
CREATE POLICY "addresses_insert_optimized"
ON public.addresses
FOR INSERT
WITH CHECK (
    -- Allow if user is authenticated (auth.uid() is not null)
    -- This is the primary check - should work for all authenticated users
    -- This check is sufficient for most cases
    (select auth.uid()) IS NOT NULL
);

-- =====================================================
-- 6. Ensure user_addresses INSERT policy allows the trigger
-- =====================================================
-- The trigger uses SECURITY DEFINER, so it should bypass RLS
-- But let's make sure the policy is correct anyway
DROP POLICY IF EXISTS "user_addresses_insert_optimized" ON public.user_addresses;
DROP POLICY IF EXISTS "Users can insert their own address links" ON public.user_addresses;

DROP POLICY IF EXISTS "user_addresses_insert_optimized" ON public.user_addresses;
CREATE POLICY "user_addresses_insert_optimized"
ON public.user_addresses
FOR INSERT
WITH CHECK (
    -- Users can insert their own links
    user_id = (select auth.uid())
    OR
    -- Admin can insert
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = (select auth.uid())
        AND u.role = 'admin'
    )
);

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- After running this migration, verify:
-- 1. Triggers exist: SELECT * FROM pg_trigger WHERE tgname LIKE '%address%';
-- 2. Policies exist: SELECT * FROM pg_policies WHERE tablename = 'addresses';
-- 3. Test insert as authenticated user

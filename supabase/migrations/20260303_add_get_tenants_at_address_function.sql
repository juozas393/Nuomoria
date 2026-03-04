-- ============================================================================
-- Migration: Create get_tenants_at_address RPC function
-- This function allows landlords to find tenant user_ids at a given address
-- Required by KomunaliniaiTab to send meter reading requests
-- ============================================================================

-- Drop existing function if any
DROP FUNCTION IF EXISTS get_tenants_at_address(uuid);

-- Create the SECURITY DEFINER function so landlords can discover tenant user_ids
-- (Direct user_addresses query is blocked by RLS — landlord can't see tenant rows)
CREATE OR REPLACE FUNCTION get_tenants_at_address(p_address_id uuid)
RETURNS TABLE (user_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  -- Method 1: Check user_addresses table for tenant role
  SELECT DISTINCT ua.user_id
  FROM user_addresses ua
  WHERE ua.address_id = p_address_id
    AND ua.role_at_address = 'tenant'
    AND ua.user_id IS NOT NULL
  
  UNION
  
  -- Method 2: Check tenants table via property -> address link
  SELECT DISTINCT t.user_id
  FROM tenants t
  JOIN properties p ON p.id = t.property_id
  WHERE p.address_id = p_address_id
    AND t.user_id IS NOT NULL
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_tenants_at_address(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenants_at_address(uuid) TO service_role;

-- ROLLBACK: DROP FUNCTION IF EXISTS get_tenants_at_address(uuid);

-- Temporary fix: Disable RLS on user_addresses table
-- This is a quick fix for development/testing purposes
-- WARNING: This removes security restrictions - use only for development!

-- Option 1: Disable RLS completely (NOT RECOMMENDED for production)
ALTER TABLE user_addresses DISABLE ROW LEVEL SECURITY;

-- Option 2: Create a permissive policy that allows all operations (BETTER for development)
-- First, drop any existing policies
DROP POLICY IF EXISTS "Allow all operations on user_addresses" ON user_addresses;

-- Create a permissive policy
CREATE POLICY "Allow all operations on user_addresses" ON user_addresses
FOR ALL USING (true) WITH CHECK (true);

-- Also ensure addresses table has proper policies
ALTER TABLE addresses DISABLE ROW LEVEL SECURITY;

-- Or create permissive policies for addresses
DROP POLICY IF EXISTS "Allow all operations on addresses" ON addresses;
CREATE POLICY "Allow all operations on addresses" ON addresses
FOR ALL USING (true) WITH CHECK (true);

-- Verify the changes
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('user_addresses', 'addresses')
AND schemaname = 'public';




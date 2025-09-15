-- Fix properties table RLS policies
-- This script adds permissive RLS policies for the properties table

-- Enable RLS on properties table
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all operations on properties" ON properties;
DROP POLICY IF EXISTS "Users can view properties they manage" ON properties;
DROP POLICY IF EXISTS "Users can insert properties" ON properties;
DROP POLICY IF EXISTS "Users can update properties they manage" ON properties;
DROP POLICY IF EXISTS "Users can delete properties they manage" ON properties;

-- Create permissive policy for development/testing
CREATE POLICY "Allow all operations on properties" ON properties
FOR ALL USING (true) WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON properties TO authenticated;
GRANT ALL ON properties TO public;

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'properties';

-- Test query to verify properties can be accessed
SELECT COUNT(*) as properties_count FROM properties;




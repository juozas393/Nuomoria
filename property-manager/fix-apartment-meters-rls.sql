-- Fix apartment_meters table RLS policies
-- This script adds permissive RLS policies for the apartment_meters table

-- Enable RLS on apartment_meters table
ALTER TABLE apartment_meters ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all operations on apartment_meters" ON apartment_meters;

-- Create permissive policy for development/testing
CREATE POLICY "Allow all operations on apartment_meters" ON apartment_meters
FOR ALL USING (true) WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON apartment_meters TO authenticated;
GRANT ALL ON apartment_meters TO public;

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'apartment_meters';

-- Test query to verify apartment_meters can be accessed
SELECT COUNT(*) as apartment_meters_count FROM apartment_meters;




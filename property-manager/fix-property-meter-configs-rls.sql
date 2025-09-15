-- Fix property_meter_configs table RLS policies
-- This script adds permissive RLS policies for the property_meter_configs table

-- Enable RLS on property_meter_configs table
ALTER TABLE property_meter_configs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all operations on property_meter_configs" ON property_meter_configs;

-- Create permissive policy for development/testing
CREATE POLICY "Allow all operations on property_meter_configs" ON property_meter_configs
FOR ALL USING (true) WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON property_meter_configs TO authenticated;
GRANT ALL ON property_meter_configs TO public;

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'property_meter_configs';

-- Test query to verify property_meter_configs can be accessed
SELECT COUNT(*) as property_meter_configs_count FROM property_meter_configs;




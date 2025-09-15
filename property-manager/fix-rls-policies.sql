-- Fix RLS Policies for user_addresses and addresses tables
-- Run this in Supabase SQL Editor

-- 1. First, check if user_addresses table exists and has RLS enabled
-- If not, create the table
CREATE TABLE IF NOT EXISTS user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  address_id UUID REFERENCES addresses(id) ON DELETE CASCADE,
  role_at_address TEXT CHECK (role_at_address IN ('landlord', 'tenant', 'property_manager', 'maintenance')) NOT NULL,
  role TEXT CHECK (role IN ('landlord', 'tenant', 'property_manager', 'maintenance')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, address_id)
);

-- 2. Enable RLS on user_addresses table
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their addresses" ON user_addresses;
DROP POLICY IF EXISTS "Users can insert their addresses" ON user_addresses;
DROP POLICY IF EXISTS "Users can update their addresses" ON user_addresses;
DROP POLICY IF EXISTS "Users can delete their addresses" ON user_addresses;
DROP POLICY IF EXISTS "Admins can manage all user addresses" ON user_addresses;

-- 4. Create comprehensive RLS policies for user_addresses

-- Policy 1: Users can view their own address relationships
CREATE POLICY "Users can view their addresses" ON user_addresses
FOR SELECT USING (user_id = auth.uid());

-- Policy 2: Users can insert their own address relationships
CREATE POLICY "Users can insert their addresses" ON user_addresses
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Policy 3: Users can update their own address relationships
CREATE POLICY "Users can update their addresses" ON user_addresses
FOR UPDATE USING (user_id = auth.uid());

-- Policy 4: Users can delete their own address relationships
CREATE POLICY "Users can delete their addresses" ON user_addresses
FOR DELETE USING (user_id = auth.uid());

-- Policy 5: Admins can manage all user addresses
CREATE POLICY "Admins can manage all user addresses" ON user_addresses
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND u.role = 'admin'
  )
);

-- 5. Check if addresses table exists and has proper RLS
-- If not, create the table
CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_address TEXT NOT NULL,
  city TEXT,
  street TEXT,
  house_number TEXT,
  postal_code TEXT,
  building_type TEXT,
  total_apartments INTEGER,
  floors INTEGER,
  management_type TEXT,
  contact_person TEXT,
  company_phone TEXT,
  company_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Enable RLS on addresses table
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- 7. Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to addresses" ON addresses;
DROP POLICY IF EXISTS "Allow public insert access to addresses" ON addresses;
DROP POLICY IF EXISTS "Allow public update access to addresses" ON addresses;
DROP POLICY IF EXISTS "Allow public delete access to addresses" ON addresses;
DROP POLICY IF EXISTS "Users can view addresses they are associated with" ON addresses;
DROP POLICY IF EXISTS "Users can insert addresses" ON addresses;
DROP POLICY IF EXISTS "Users can update addresses they manage" ON addresses;
DROP POLICY IF EXISTS "Admins can manage all addresses" ON addresses;

-- 8. Create comprehensive RLS policies for addresses

-- Policy 1: Allow public read access (for now, can be restricted later)
CREATE POLICY "Allow public read access to addresses" ON addresses
FOR SELECT USING (true);

-- Policy 2: Users can insert new addresses
CREATE POLICY "Users can insert addresses" ON addresses
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Policy 3: Users can update addresses they are associated with
CREATE POLICY "Users can update addresses they manage" ON addresses
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM user_addresses ua 
    WHERE ua.address_id = addresses.id 
    AND ua.user_id = auth.uid()
    AND ua.role IN ('landlord', 'property_manager', 'admin')
  )
);

-- Policy 4: Users can delete addresses they manage
CREATE POLICY "Users can delete addresses they manage" ON addresses
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM user_addresses ua 
    WHERE ua.address_id = addresses.id 
    AND ua.user_id = auth.uid()
    AND ua.role IN ('landlord', 'property_manager', 'admin')
  )
);

-- Policy 5: Admins can manage all addresses
CREATE POLICY "Admins can manage all addresses" ON addresses
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND u.role = 'admin'
  )
);

-- 9. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_address_id ON user_addresses(address_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_role ON user_addresses(role);
CREATE INDEX IF NOT EXISTS idx_addresses_city ON addresses(city);
CREATE INDEX IF NOT EXISTS idx_addresses_full_address ON addresses(full_address);

-- 10. Grant necessary permissions
GRANT ALL ON user_addresses TO authenticated;
GRANT ALL ON addresses TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 11. Verify the setup
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('user_addresses', 'addresses')
AND schemaname = 'public';

-- 12. List all policies for verification
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('user_addresses', 'addresses')
AND schemaname = 'public';




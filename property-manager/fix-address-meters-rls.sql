-- Fix RLS Policies for address_meters table
-- Run this in Supabase SQL Editor

-- 1. Check if address_meters table exists and has RLS enabled
-- If not, create the table
CREATE TABLE IF NOT EXISTS address_meters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address_id UUID REFERENCES addresses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('individual', 'communal')) NOT NULL,
  unit TEXT NOT NULL,
  price_per_unit DECIMAL(10,4) NOT NULL DEFAULT 0,
  fixed_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  distribution_method TEXT CHECK (distribution_method IN ('per_consumption', 'per_apartment', 'per_area')) NOT NULL,
  description TEXT,
  requires_photo BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS on address_meters table
ALTER TABLE address_meters ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all operations on address_meters" ON address_meters;
DROP POLICY IF EXISTS "Users can view meters for their addresses" ON address_meters;
DROP POLICY IF EXISTS "Users can insert meters for their addresses" ON address_meters;
DROP POLICY IF EXISTS "Users can update meters for their addresses" ON address_meters;
DROP POLICY IF EXISTS "Users can delete meters for their addresses" ON address_meters;
DROP POLICY IF EXISTS "Admins can manage all address meters" ON address_meters;

-- 4. Create comprehensive RLS policies for address_meters

-- Policy 1: Allow all operations (permissive for development)
CREATE POLICY "Allow all operations on address_meters" ON address_meters
FOR ALL USING (true) WITH CHECK (true);

-- Policy 2: Users can view meters for addresses they are associated with
CREATE POLICY "Users can view meters for their addresses" ON address_meters
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_addresses ua 
    WHERE ua.address_id = address_meters.address_id 
    AND ua.user_id = auth.uid()
  )
);

-- Policy 3: Users can insert meters for addresses they manage
CREATE POLICY "Users can insert meters for their addresses" ON address_meters
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_addresses ua 
    WHERE ua.address_id = address_meters.address_id 
    AND ua.user_id = auth.uid()
    AND ua.role IN ('landlord', 'property_manager', 'admin')
  )
);

-- Policy 4: Users can update meters for addresses they manage
CREATE POLICY "Users can update meters for their addresses" ON address_meters
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM user_addresses ua 
    WHERE ua.address_id = address_meters.address_id 
    AND ua.user_id = auth.uid()
    AND ua.role IN ('landlord', 'property_manager', 'admin')
  )
);

-- Policy 5: Users can delete meters for addresses they manage
CREATE POLICY "Users can delete meters for their addresses" ON address_meters
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM user_addresses ua 
    WHERE ua.address_id = address_meters.address_id 
    AND ua.user_id = auth.uid()
    AND ua.role IN ('landlord', 'property_manager', 'admin')
  )
);

-- Policy 6: Admins can manage all address meters
CREATE POLICY "Admins can manage all address meters" ON address_meters
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND u.role = 'admin'
  )
);

-- 5. Create apartments table first if it doesn't exist
CREATE TABLE IF NOT EXISTS apartments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address_id UUID REFERENCES addresses(id) ON DELETE CASCADE,
  apartment_number TEXT NOT NULL,
  tenant_name TEXT,
  phone TEXT,
  email TEXT,
  rent DECIMAL(10,2) DEFAULT 0,
  area INTEGER,
  rooms INTEGER,
  status TEXT DEFAULT 'occupied' CHECK (status IN ('occupied', 'vacant', 'maintenance')),
  contract_start DATE,
  contract_end DATE,
  deposit_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on apartments table
ALTER TABLE apartments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all operations on apartments" ON apartments;
DROP POLICY IF EXISTS "Users can view apartments for their addresses" ON apartments;
DROP POLICY IF EXISTS "Users can insert apartments for their addresses" ON apartments;
DROP POLICY IF EXISTS "Users can update apartments for their addresses" ON apartments;
DROP POLICY IF EXISTS "Users can delete apartments for their addresses" ON apartments;
DROP POLICY IF EXISTS "Admins can manage all apartments" ON apartments;

-- Create comprehensive RLS policies for apartments

-- Policy 1: Allow all operations (permissive for development)
CREATE POLICY "Allow all operations on apartments" ON apartments
FOR ALL USING (true) WITH CHECK (true);

-- Policy 2: Users can view apartments for addresses they are associated with
CREATE POLICY "Users can view apartments for their addresses" ON apartments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_addresses ua 
    WHERE ua.address_id = apartments.address_id 
    AND ua.user_id = auth.uid()
  )
);

-- Policy 3: Users can insert apartments for addresses they manage
CREATE POLICY "Users can insert apartments for their addresses" ON apartments
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_addresses ua 
    WHERE ua.address_id = apartments.address_id 
    AND ua.user_id = auth.uid()
    AND ua.role IN ('landlord', 'property_manager', 'admin')
  )
);

-- Policy 4: Users can update apartments for addresses they manage
CREATE POLICY "Users can update apartments for their addresses" ON apartments
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM user_addresses ua 
    WHERE ua.address_id = apartments.address_id 
    AND ua.user_id = auth.uid()
    AND ua.role IN ('landlord', 'property_manager', 'admin')
  )
);

-- Policy 5: Users can delete apartments for addresses they manage
CREATE POLICY "Users can delete apartments for their addresses" ON apartments
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM user_addresses ua 
    WHERE ua.address_id = apartments.address_id 
    AND ua.user_id = auth.uid()
    AND ua.role IN ('landlord', 'property_manager', 'admin')
  )
);

-- Policy 6: Admins can manage all apartments
CREATE POLICY "Admins can manage all apartments" ON apartments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND u.role = 'admin'
  )
);

-- 6. Also fix apartment_meters table if it exists
CREATE TABLE IF NOT EXISTS apartment_meters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('individual', 'communal')) NOT NULL,
  unit TEXT NOT NULL,
  price_per_unit DECIMAL(10,4) NOT NULL DEFAULT 0,
  fixed_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  distribution_method TEXT CHECK (distribution_method IN ('per_consumption', 'per_apartment', 'per_area')) NOT NULL,
  description TEXT,
  requires_photo BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on apartment_meters table
ALTER TABLE apartment_meters ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all operations on apartment_meters" ON apartment_meters;
DROP POLICY IF EXISTS "Users can view apartment meters for their addresses" ON apartment_meters;
DROP POLICY IF EXISTS "Users can insert apartment meters for their addresses" ON apartment_meters;
DROP POLICY IF EXISTS "Users can update apartment meters for their addresses" ON apartment_meters;
DROP POLICY IF EXISTS "Users can delete apartment meters for their addresses" ON apartment_meters;
DROP POLICY IF EXISTS "Admins can manage all apartment meters" ON apartment_meters;

-- Create comprehensive RLS policies for apartment_meters

-- Policy 1: Allow all operations (permissive for development)
CREATE POLICY "Allow all operations on apartment_meters" ON apartment_meters
FOR ALL USING (true) WITH CHECK (true);

-- Policy 2: Users can view apartment meters for addresses they are associated with
CREATE POLICY "Users can view apartment meters for their addresses" ON apartment_meters
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_addresses ua 
    JOIN apartments a ON a.address_id = ua.address_id
    WHERE a.id = apartment_meters.apartment_id 
    AND ua.user_id = auth.uid()
  )
);

-- Policy 3: Users can insert apartment meters for addresses they manage
CREATE POLICY "Users can insert apartment meters for their addresses" ON apartment_meters
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_addresses ua 
    JOIN apartments a ON a.address_id = ua.address_id
    WHERE a.id = apartment_meters.apartment_id 
    AND ua.user_id = auth.uid()
    AND ua.role IN ('landlord', 'property_manager', 'admin')
  )
);

-- Policy 4: Users can update apartment meters for addresses they manage
CREATE POLICY "Users can update apartment meters for their addresses" ON apartment_meters
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM user_addresses ua 
    JOIN apartments a ON a.address_id = ua.address_id
    WHERE a.id = apartment_meters.apartment_id 
    AND ua.user_id = auth.uid()
    AND ua.role IN ('landlord', 'property_manager', 'admin')
  )
);

-- Policy 5: Users can delete apartment meters for addresses they manage
CREATE POLICY "Users can delete apartment meters for their addresses" ON apartment_meters
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM user_addresses ua 
    JOIN apartments a ON a.address_id = ua.address_id
    WHERE a.id = apartment_meters.apartment_id 
    AND ua.user_id = auth.uid()
    AND ua.role IN ('landlord', 'property_manager', 'admin')
  )
);

-- Policy 6: Admins can manage all apartment meters
CREATE POLICY "Admins can manage all apartment meters" ON apartment_meters
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND u.role = 'admin'
  )
);

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_address_meters_address_id ON address_meters(address_id);
CREATE INDEX IF NOT EXISTS idx_address_meters_type ON address_meters(type);
CREATE INDEX IF NOT EXISTS idx_address_meters_is_active ON address_meters(is_active);
CREATE INDEX IF NOT EXISTS idx_apartment_meters_apartment_id ON apartment_meters(apartment_id);
CREATE INDEX IF NOT EXISTS idx_apartment_meters_type ON apartment_meters(type);
CREATE INDEX IF NOT EXISTS idx_apartment_meters_is_active ON apartment_meters(is_active);

-- 8. Grant necessary permissions
GRANT ALL ON address_meters TO authenticated;
GRANT ALL ON apartment_meters TO authenticated;
GRANT ALL ON apartments TO authenticated;

-- 9. Verify the setup
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('address_meters', 'apartment_meters', 'apartments')
AND schemaname = 'public';

-- 10. List all policies for verification
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
WHERE tablename IN ('address_meters', 'apartment_meters', 'apartments')
AND schemaname = 'public';

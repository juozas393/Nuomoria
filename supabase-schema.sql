-- Create properties table
CREATE TABLE IF NOT EXISTS properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  address VARCHAR(255) NOT NULL,
  apartment_number VARCHAR(50) NOT NULL,
  tenant_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  rent DECIMAL(10,2) NOT NULL,
  area INTEGER,
  rooms INTEGER,
  status VARCHAR(50) DEFAULT 'occupied' CHECK (status IN ('occupied', 'vacant', 'maintenance')),
  contract_start DATE NOT NULL,
  contract_end DATE NOT NULL,
  tenant_response VARCHAR(50) CHECK (tenant_response IN ('wants_to_renew', 'does_not_want_to_renew', 'no_response')),
  tenant_response_date TIMESTAMP WITH TIME ZONE,
  planned_move_out_date DATE,
  deposit_amount DECIMAL(10,2) DEFAULT 0,
  deposit_paid_amount DECIMAL(10,2) DEFAULT 0,
  deposit_paid BOOLEAN DEFAULT false,
  deposit_returned BOOLEAN DEFAULT false,
  deposit_deductions DECIMAL(10,2) DEFAULT 0,
  bedding_owner VARCHAR(50) CHECK (bedding_owner IN ('tenant', 'landlord')),
  bedding_fee_paid BOOLEAN DEFAULT false,
  cleaning_required BOOLEAN DEFAULT false,
  cleaning_cost DECIMAL(10,2) DEFAULT 0,
  auto_renewal_enabled BOOLEAN DEFAULT false,
  last_notification_sent TIMESTAMP WITH TIME ZONE,
  notification_count INTEGER DEFAULT 0,
  original_contract_duration_months INTEGER DEFAULT 12,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create meter_readings table
CREATE TABLE IF NOT EXISTS meter_readings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('electricity', 'water', 'heating', 'internet', 'garbage', 'gas')),
  previous_reading DECIMAL(10,2) NOT NULL,
  current_reading DECIMAL(10,2) NOT NULL,
  difference DECIMAL(10,2) NOT NULL,
  price_per_unit DECIMAL(10,4) NOT NULL,
  total_sum DECIMAL(10,2) NOT NULL,
  reading_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  invoice_number VARCHAR(50) NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  rent_amount DECIMAL(10,2) NOT NULL,
  utilities_amount DECIMAL(10,2) DEFAULT 0,
  other_amount DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(50) NOT NULL CHECK (status IN ('paid', 'unpaid', 'overdue', 'cancelled')),
  paid_date DATE,
  payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'bank_transfer', 'card', 'check')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE meter_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Create policies for properties table
CREATE POLICY "Allow public read access to properties" ON properties
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to properties" ON properties
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to properties" ON properties
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to properties" ON properties
  FOR DELETE USING (true);

-- Create policies for meter_readings table
CREATE POLICY "Allow public read access to meter_readings" ON meter_readings
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to meter_readings" ON meter_readings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to meter_readings" ON meter_readings
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to meter_readings" ON meter_readings
  FOR DELETE USING (true);

-- Create policies for invoices table
CREATE POLICY "Allow public read access to invoices" ON invoices
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to invoices" ON invoices
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to invoices" ON invoices
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to invoices" ON invoices
  FOR DELETE USING (true);

-- Create policies for tenants table
CREATE POLICY "Allow public read access to tenants" ON tenants
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to tenants" ON tenants
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to tenants" ON tenants
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to tenants" ON tenants
  FOR DELETE USING (true);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  -- Add auto_renewal_enabled column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'auto_renewal_enabled') THEN
    ALTER TABLE properties ADD COLUMN auto_renewal_enabled BOOLEAN DEFAULT false;
  END IF;
  
  -- Add last_notification_sent column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'last_notification_sent') THEN
    ALTER TABLE properties ADD COLUMN last_notification_sent TIMESTAMP WITH TIME ZONE;
  END IF;
  
  -- Add notification_count column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'notification_count') THEN
    ALTER TABLE properties ADD COLUMN notification_count INTEGER DEFAULT 0;
  END IF;
  
  -- Add original_contract_duration_months column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'original_contract_duration_months') THEN
    ALTER TABLE properties ADD COLUMN original_contract_duration_months INTEGER DEFAULT 12;
  END IF;
  
  -- Add tenant_response column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'tenant_response') THEN
    ALTER TABLE properties ADD COLUMN tenant_response VARCHAR(50) CHECK (tenant_response IN ('wants_to_renew', 'does_not_want_to_renew', 'no_response'));
  END IF;
  
  -- Add deposit_amount column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'deposit_amount') THEN
    ALTER TABLE properties ADD COLUMN deposit_amount DECIMAL(10,2) DEFAULT 0;
  END IF;
  
  -- Add deposit_paid column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'deposit_paid') THEN
    ALTER TABLE properties ADD COLUMN deposit_paid BOOLEAN DEFAULT false;
  END IF;
  
  -- Add deposit_returned column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'deposit_returned') THEN
    ALTER TABLE properties ADD COLUMN deposit_returned BOOLEAN DEFAULT false;
  END IF;
  
  -- Add deposit_deductions column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'deposit_deductions') THEN
    ALTER TABLE properties ADD COLUMN deposit_deductions DECIMAL(10,2) DEFAULT 0;
  END IF;
  
  -- Add bedding_owner column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'bedding_owner') THEN
    ALTER TABLE properties ADD COLUMN bedding_owner VARCHAR(50) CHECK (bedding_owner IN ('tenant', 'landlord'));
  END IF;
  
  -- Add bedding_fee_paid column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'bedding_fee_paid') THEN
    ALTER TABLE properties ADD COLUMN bedding_fee_paid BOOLEAN DEFAULT false;
  END IF;
  
  -- Add cleaning_required column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'cleaning_required') THEN
    ALTER TABLE properties ADD COLUMN cleaning_required BOOLEAN DEFAULT false;
  END IF;
  
  -- Add cleaning_cost column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'cleaning_cost') THEN
    ALTER TABLE properties ADD COLUMN cleaning_cost DECIMAL(10,2) DEFAULT 0;
  END IF;
END $$; 
-- =====================================================
-- STREAMLINED DATABASE EXPORT - ONLY USED TABLES
-- Based on actual code analysis - these are the tables you're using
-- =====================================================

-- Create only the tables that are actually used in your application

-- 1. ADDRESSES (Core table - heavily used)
CREATE TABLE IF NOT EXISTS addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  full_address VARCHAR(255) NOT NULL,
  street VARCHAR(255),
  house_number VARCHAR(20),
  city VARCHAR(100) NOT NULL,
  postal_code VARCHAR(10),
  coordinates_lat NUMERIC(10,8),
  coordinates_lng NUMERIC(11,8),
  building_type VARCHAR(100) DEFAULT 'Butų namas'::character varying,
  total_apartments INTEGER DEFAULT 1,
  floors INTEGER DEFAULT 1,
  year_built INTEGER,
  management_type VARCHAR(50) DEFAULT 'Nuomotojas'::character varying,
  chairman_name VARCHAR(255),
  chairman_phone VARCHAR(50),
  chairman_email VARCHAR(255),
  company_name VARCHAR(255),
  contact_person VARCHAR(255),
  company_phone VARCHAR(50),
  company_email VARCHAR(255),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. ADDRESS_METERS (Used in meter management)
CREATE TABLE IF NOT EXISTS address_meters (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  address_id UUID,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  price_per_unit NUMERIC(10,2) DEFAULT 0,
  fixed_price NUMERIC(10,2) DEFAULT 0,
  distribution_method VARCHAR(50) NOT NULL,
  description TEXT,
  requires_photo BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  policy JSONB DEFAULT '{"scope": "building", "collectionMode": "landlord_only"}'::jsonb
);

-- 3. ADDRESS_SETTINGS (Used in communal meters API)
CREATE TABLE IF NOT EXISTS address_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  address_id UUID NOT NULL,
  building_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  contact_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  financial_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  notification_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  communal_config JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. APARTMENT_METERS (Used in meter management)
CREATE TABLE IF NOT EXISTS apartment_meters (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  property_id UUID,
  address_meter_id UUID,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  price_per_unit NUMERIC(10,2) DEFAULT 0,
  fixed_price NUMERIC(10,2) DEFAULT 0,
  distribution_method VARCHAR(50) NOT NULL,
  description TEXT,
  requires_photo BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  is_custom BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  policy JSONB DEFAULT '{"scope": "apartment", "collectionMode": "landlord_only"}'::jsonb
);

-- 5. COMMUNAL_EXPENSES (Used in communal meters API)
CREATE TABLE IF NOT EXISTS communal_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  address_id UUID,
  meter_id UUID,
  month VARCHAR(7) NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  total_units NUMERIC(10,2),
  distribution_amount NUMERIC(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. COMMUNAL_EXPENSES_NEW (Used in communal meters API)
CREATE TABLE IF NOT EXISTS communal_expenses_new (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  meter_id UUID NOT NULL,
  month VARCHAR(7) NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  total_units NUMERIC(10,2),
  distribution_amount NUMERIC(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. COMMUNAL_METERS (Used in communal meters API)
CREATE TABLE IF NOT EXISTS communal_meters (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  address_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  price_per_unit NUMERIC(10,2) DEFAULT 0.00,
  fixed_price NUMERIC(10,2) DEFAULT 0.00,
  distribution_method VARCHAR(50) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 8. INVOICES (Used in database.ts)
CREATE TABLE IF NOT EXISTS invoices (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  property_id UUID,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  rent_amount NUMERIC(10,2) NOT NULL,
  utilities_amount NUMERIC(10,2) DEFAULT 0,
  other_amount NUMERIC(10,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid'::text,
  paid_date DATE,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 9. METER_READINGS (Heavily used - core functionality)
CREATE TABLE IF NOT EXISTS meter_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  property_id UUID,
  meter_id UUID,
  meter_type VARCHAR(20) NOT NULL,
  type VARCHAR(50) NOT NULL,
  reading_date DATE NOT NULL,
  previous_reading NUMERIC(10,2),
  current_reading NUMERIC(10,2) NOT NULL,
  consumption NUMERIC(10,2),
  difference NUMERIC(10,2) NOT NULL,
  price_per_unit NUMERIC(10,2) NOT NULL,
  total_sum NUMERIC(10,2) NOT NULL,
  amount NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 10. NOTIFICATIONS (Used in NotificationCenter)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  property_id UUID,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'::text,
  sent_at TIMESTAMP WITH TIME ZONE,
  recipient_email TEXT,
  recipient_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 11. PASSWORD_RESETS (Used in userApi.ts)
CREATE TABLE IF NOT EXISTS password_resets (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID,
  reset_token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 12. PROPERTIES (Core table - heavily used)
CREATE TABLE IF NOT EXISTS properties (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  address_id UUID,
  address VARCHAR(255),
  apartment_number VARCHAR(10) NOT NULL,
  tenant_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  rent NUMERIC(10,2) NOT NULL,
  area INTEGER,
  rooms INTEGER,
  status VARCHAR(50) DEFAULT 'occupied'::character varying,
  contract_start DATE NOT NULL,
  contract_end DATE NOT NULL,
  auto_renewal_enabled BOOLEAN DEFAULT false,
  deposit_amount NUMERIC(10,2) DEFAULT 0,
  deposit_paid_amount NUMERIC(10,2) DEFAULT 0,
  deposit_paid BOOLEAN DEFAULT false,
  deposit_returned BOOLEAN DEFAULT false,
  deposit_deductions NUMERIC(10,2) DEFAULT 0,
  bedding_owner VARCHAR(50) DEFAULT 'tenant'::character varying,
  bedding_fee_paid BOOLEAN DEFAULT false,
  cleaning_required BOOLEAN DEFAULT false,
  cleaning_cost NUMERIC(10,2) DEFAULT 0,
  last_notification_sent TIMESTAMP WITH TIME ZONE,
  notification_count INTEGER DEFAULT 0,
  original_contract_duration_months INTEGER DEFAULT 12,
  tenant_response VARCHAR(50) DEFAULT 'no_response'::character varying,
  tenant_response_date TIMESTAMP WITH TIME ZONE,
  planned_move_out_date DATE,
  contract_status VARCHAR(50) DEFAULT 'active'::character varying,
  payment_status VARCHAR(50) DEFAULT 'current'::character varying,
  deposit_status VARCHAR(50) DEFAULT 'unpaid'::character varying,
  notification_status VARCHAR(50) DEFAULT 'none'::character varying,
  tenant_communication_status VARCHAR(50) DEFAULT 'responsive'::character varying,
  owner_id UUID,
  manager_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 13. PROPERTY_METER_CONFIGS (Used in database.ts and api.ts)
CREATE TABLE IF NOT EXISTS property_meter_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  property_id UUID,
  meter_type TEXT NOT NULL,
  custom_name TEXT,
  unit TEXT NOT NULL,
  tariff TEXT NOT NULL DEFAULT 'single'::text,
  price_per_unit NUMERIC(8,4) NOT NULL,
  fixed_price NUMERIC(8,2),
  initial_reading NUMERIC(10,2),
  initial_date DATE,
  require_photo BOOLEAN DEFAULT true,
  require_serial BOOLEAN DEFAULT false,
  serial_number TEXT,
  provider TEXT,
  status TEXT NOT NULL DEFAULT 'active'::text,
  notes TEXT,
  is_inherited BOOLEAN DEFAULT false,
  address_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  type VARCHAR(50) NOT NULL DEFAULT 'individual'::character varying
);

-- 14. TENANTS (Used in database.ts and api.ts)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  property_id UUID,
  user_id UUID,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  role VARCHAR(100) DEFAULT 'Nuomininkas'::character varying,
  monthly_income NUMERIC(10,2),
  contract_start DATE NOT NULL,
  contract_end DATE NOT NULL,
  lease_start DATE,
  lease_end DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 15. USER_ADDRESSES (Used in userApi.ts and Nuomotojas2Dashboard)
CREATE TABLE IF NOT EXISTS user_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID,
  address_id UUID,
  role_at_address VARCHAR(50) NOT NULL,
  role VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 16. USER_PERMISSIONS (Used in AuthContext and userApi.ts)
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID,
  permission VARCHAR(100) NOT NULL,
  granted BOOLEAN DEFAULT true,
  granted_by UUID,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 17. USERS (Core table - heavily used)
CREATE TABLE IF NOT EXISTS users (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(50) NOT NULL DEFAULT 'tenant'::character varying,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP WITH TIME ZONE,
  google_linked BOOLEAN DEFAULT false,
  google_email TEXT
);

-- =====================================================
-- ADD PRIMARY KEYS
-- =====================================================

ALTER TABLE addresses ADD PRIMARY KEY (id);
ALTER TABLE address_meters ADD PRIMARY KEY (id);
ALTER TABLE address_settings ADD PRIMARY KEY (id);
ALTER TABLE apartment_meters ADD PRIMARY KEY (id);
ALTER TABLE communal_expenses ADD PRIMARY KEY (id);
ALTER TABLE communal_expenses_new ADD PRIMARY KEY (id);
ALTER TABLE communal_meters ADD PRIMARY KEY (id);
ALTER TABLE invoices ADD PRIMARY KEY (id);
ALTER TABLE meter_readings ADD PRIMARY KEY (id);
ALTER TABLE notifications ADD PRIMARY KEY (id);
ALTER TABLE password_resets ADD PRIMARY KEY (id);
ALTER TABLE properties ADD PRIMARY KEY (id);
ALTER TABLE property_meter_configs ADD PRIMARY KEY (id);
ALTER TABLE tenants ADD PRIMARY KEY (id);
ALTER TABLE user_addresses ADD PRIMARY KEY (id);
ALTER TABLE user_permissions ADD PRIMARY KEY (id);
ALTER TABLE users ADD PRIMARY KEY (id);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE address_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE address_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE apartment_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE communal_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE communal_expenses_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE communal_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE meter_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_meter_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CREATE BASIC POLICIES (Allow public access for now)
-- =====================================================

DO $$
DECLARE
    table_name text;
BEGIN
    FOR table_name IN 
        SELECT unnest(ARRAY[
            'addresses', 'address_meters', 'address_settings', 'apartment_meters',
            'communal_expenses', 'communal_expenses_new', 'communal_meters',
            'invoices', 'meter_readings', 'notifications', 'password_resets',
            'properties', 'property_meter_configs', 'tenants', 'user_addresses',
            'user_permissions', 'users'
        ])
    LOOP
        EXECUTE 'CREATE POLICY "Allow public read access to ' || table_name || '" ON ' || table_name || ' FOR SELECT USING (true)';
        EXECUTE 'CREATE POLICY "Allow public insert access to ' || table_name || '" ON ' || table_name || ' FOR INSERT WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "Allow public update access to ' || table_name || '" ON ' || table_name || ' FOR UPDATE USING (true)';
        EXECUTE 'CREATE POLICY "Allow public delete access to ' || table_name || '" ON ' || table_name || ' FOR DELETE USING (true)';
    END LOOP;
END $$;

-- =====================================================
-- SUMMARY: 17 USED TABLES vs 26 TOTAL TABLES
-- =====================================================
-- ✅ USED TABLES (17):
-- 1. addresses
-- 2. address_meters  
-- 3. address_settings
-- 4. apartment_meters
-- 5. communal_expenses
-- 6. communal_expenses_new
-- 7. communal_meters
-- 8. invoices
-- 9. meter_readings
-- 10. notifications
-- 11. password_resets
-- 12. properties
-- 13. property_meter_configs
-- 14. tenants
-- 15. user_addresses
-- 16. user_permissions
-- 17. users

-- ❌ UNUSED TABLES (9):
-- 1. automated_actions
-- 2. contract_history
-- 3. documents
-- 4. login_attempts
-- 5. maintenance_requests
-- 6. notes
-- 7. notification_history
-- 8. payment_records
-- 9. utility_bills

-- =====================================================
-- INSTRUCTIONS:
-- 1. Run this script in your PRODUCTION database first
-- 2. Then export data from development database for these 17 tables only
-- 3. Import the data to production database
-- =====================================================





-- =====================================================
-- BASIC DATABASE SCHEMA FOR PROPERTY MANAGEMENT SYSTEM
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create properties table
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    address VARCHAR(255) NOT NULL,
    apartment_number VARCHAR(50) NOT NULL,
    tenant_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    rent DECIMAL(10,2) NOT NULL,
    area INTEGER,
    rooms INTEGER,
    status VARCHAR(20) DEFAULT 'occupied' CHECK (status IN ('occupied', 'vacant', 'maintenance')),
    contract_start DATE NOT NULL,
    contract_end DATE NOT NULL,
    tenant_response VARCHAR(50) CHECK (tenant_response IN ('wants_to_renew', 'does_not_want_to_renew', 'no_response')),
    tenant_response_date TIMESTAMP WITH TIME ZONE,
    planned_move_out_date DATE,
    move_out_notice_date TIMESTAMP WITH TIME ZONE,
    deposit_amount DECIMAL(10,2) DEFAULT 0,
    deposit_paid_amount DECIMAL(10,2) DEFAULT 0,
    deposit_paid BOOLEAN DEFAULT false,
    deposit_returned BOOLEAN DEFAULT false,
    deposit_deductions DECIMAL(10,2) DEFAULT 0,
    bedding_owner VARCHAR(20) CHECK (bedding_owner IN ('tenant', 'landlord')),
    bedding_fee_paid BOOLEAN DEFAULT false,
    cleaning_required BOOLEAN DEFAULT false,
    cleaning_cost DECIMAL(10,2) DEFAULT 0,
    last_notification_sent TIMESTAMP WITH TIME ZONE,
    notification_count INTEGER DEFAULT 0,
    original_contract_duration_months INTEGER DEFAULT 12,
    auto_renewal_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create meter_readings table
CREATE TABLE IF NOT EXISTS meter_readings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    meter_id VARCHAR(255),
    meter_type VARCHAR(20) NOT NULL CHECK (meter_type IN ('address', 'apartment')),
    type VARCHAR(20) NOT NULL CHECK (type IN ('electricity', 'water', 'heating', 'internet', 'garbage', 'gas')),
    reading_date DATE NOT NULL,
    previous_reading DECIMAL(10,2),
    current_reading DECIMAL(10,2) NOT NULL,
    consumption DECIMAL(10,2) GENERATED ALWAYS AS (current_reading - COALESCE(previous_reading, 0)) STORED,
    price_per_unit DECIMAL(10,4) NOT NULL,
    total_sum DECIMAL(10,2) GENERATED ALWAYS AS (consumption * price_per_unit) STORED,
    amount DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create property_meter_configs table
CREATE TABLE IF NOT EXISTS property_meter_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    meter_type VARCHAR(20) NOT NULL CHECK (meter_type IN ('electricity', 'water_cold', 'water_hot', 'gas', 'heating', 'internet', 'garbage', 'custom')),
    custom_name VARCHAR(255),
    unit VARCHAR(10) NOT NULL CHECK (unit IN ('m3', 'kWh', 'GJ', 'MB', 'fixed')),
    tariff VARCHAR(20) DEFAULT 'single' CHECK (tariff IN ('single', 'day_night', 'peak_offpeak')),
    price_per_unit DECIMAL(10,4) NOT NULL,
    fixed_price DECIMAL(10,2),
    initial_reading DECIMAL(10,2),
    initial_date DATE,
    require_photo BOOLEAN DEFAULT true,
    require_serial BOOLEAN DEFAULT false,
    serial_number VARCHAR(255),
    provider VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    rent_amount DECIMAL(10,2) NOT NULL,
    utilities_amount DECIMAL(10,2) DEFAULT 0,
    other_amount DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid', 'overdue', 'cancelled')),
    paid_date TIMESTAMP WITH TIME ZONE,
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'bank_transfer', 'card', 'check')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create addresses table
CREATE TABLE IF NOT EXISTS addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_address VARCHAR(500) NOT NULL,
    street VARCHAR(255),
    house_number VARCHAR(20),
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    coordinates_lat DECIMAL(10, 8),
    coordinates_lng DECIMAL(11, 8),
    building_type VARCHAR(50) DEFAULT 'apartment',
    total_apartments INTEGER DEFAULT 1,
    floors INTEGER DEFAULT 1,
    year_built INTEGER,
    management_type VARCHAR(50) DEFAULT 'private',
    chairman_name VARCHAR(255),
    chairman_phone VARCHAR(20),
    chairman_email VARCHAR(255),
    company_name VARCHAR(255),
    contact_person VARCHAR(255),
    company_phone VARCHAR(20),
    company_email VARCHAR(255),
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_properties_address ON properties(address);
CREATE INDEX IF NOT EXISTS idx_properties_apartment ON properties(apartment_number);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_meter_readings_property ON meter_readings(property_id);
CREATE INDEX IF NOT EXISTS idx_meter_readings_date ON meter_readings(reading_date);
CREATE INDEX IF NOT EXISTS idx_invoices_property ON invoices(property_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_addresses_city ON addresses(city);

-- Enable Row Level Security (RLS)
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE meter_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_meter_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (allow all for now - you can restrict later)
CREATE POLICY "Allow all operations on properties" ON properties FOR ALL USING (true);
CREATE POLICY "Allow all operations on tenants" ON tenants FOR ALL USING (true);
CREATE POLICY "Allow all operations on meter_readings" ON meter_readings FOR ALL USING (true);
CREATE POLICY "Allow all operations on property_meter_configs" ON property_meter_configs FOR ALL USING (true);
CREATE POLICY "Allow all operations on invoices" ON invoices FOR ALL USING (true);
CREATE POLICY "Allow all operations on addresses" ON addresses FOR ALL USING (true);

-- Insert some sample data
INSERT INTO properties (
    address, apartment_number, tenant_name, phone, email, rent, area, rooms,
    contract_start, contract_end, deposit_amount
) VALUES (
    'Vilniaus g. 1, Vilnius', '1', 'Jonas Jonaitis', '+37060000001', 'jonas@example.com',
    500.00, 50, 2, '2024-01-01', '2024-12-31', 1000.00
), (
    'Vilniaus g. 1, Vilnius', '2', 'Petras Petraitis', '+37060000002', 'petras@example.com',
    600.00, 60, 3, '2024-01-01', '2024-12-31', 1200.00
);

INSERT INTO tenants (name, email, phone) VALUES
('Jonas Jonaitis', 'jonas@example.com', '+37060000001'),
('Petras Petraitis', 'petras@example.com', '+37060000002');

INSERT INTO addresses (full_address, street, house_number, city, postal_code) VALUES
('Vilniaus g. 1, Vilnius', 'Vilniaus g.', '1', 'Vilnius', '01101');

-- Create address_settings table
CREATE TABLE IF NOT EXISTS address_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    address_id UUID NOT NULL REFERENCES addresses(id) ON DELETE CASCADE,
    building_info JSONB NOT NULL DEFAULT '{}',
    contact_info JSONB NOT NULL DEFAULT '{}',
    financial_settings JSONB NOT NULL DEFAULT '{}',
    notification_settings JSONB NOT NULL DEFAULT '{}',
    communal_config JSONB DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(address_id)
);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meter_readings_updated_at BEFORE UPDATE ON meter_readings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_property_meter_configs_updated_at BEFORE UPDATE ON property_meter_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_address_settings_updated_at BEFORE UPDATE ON address_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for address_settings table
ALTER TABLE address_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for address_settings
CREATE POLICY "Users can view address_settings for their addresses" ON address_settings
    FOR SELECT USING (
        address_id IN (
            SELECT ua.address_id 
            FROM user_addresses ua 
            WHERE ua.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert address_settings for their addresses" ON address_settings
    FOR INSERT WITH CHECK (
        address_id IN (
            SELECT ua.address_id 
            FROM user_addresses ua 
            WHERE ua.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update address_settings for their addresses" ON address_settings
    FOR UPDATE USING (
        address_id IN (
            SELECT ua.address_id 
            FROM user_addresses ua 
            WHERE ua.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete address_settings for their addresses" ON address_settings
    FOR DELETE USING (
        address_id IN (
            SELECT ua.address_id 
            FROM user_addresses ua 
            WHERE ua.user_id = auth.uid()
        )
    );

-- Success message
SELECT 'Database schema created successfully!' as message;

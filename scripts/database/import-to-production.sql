-- =====================================================
-- IMPORT SCRIPT FOR PRODUCTION DATABASE
-- Run this in your PRODUCTION database: qdsduvwojbknslbviqdq.supabase.co
-- =====================================================

-- STEP 1: First, run the schema creation script
-- (Copy and paste the entire supabase-schema.sql content here first)

-- STEP 2: Import Properties Data
-- Copy the output from properties-export.sql and paste it here
-- Example format:
/*
INSERT INTO properties (id, address, apartment_number, tenant_name, phone, email, rent, area, rooms, status, contract_start, contract_end, tenant_response, tenant_response_date, planned_move_out_date, deposit_amount, deposit_paid_amount, deposit_paid, deposit_returned, deposit_deductions, bedding_owner, bedding_fee_paid, cleaning_required, cleaning_cost, auto_renewal_enabled, last_notification_sent, notification_count, original_contract_duration_months, created_at, updated_at) VALUES 
('uuid-here', 'Address here', 'Apt 1', 'Tenant Name', '123456789', 'email@example.com', 500.00, 50, 2, 'occupied', '2024-01-01', '2024-12-31', NULL, NULL, NULL, 1000.00, 1000.00, true, false, 0.00, 'tenant', false, false, 0.00, false, NULL, 0, 12, '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00');
*/

-- STEP 3: Import Meter Readings Data
-- Copy the output from meter_readings-export.sql and paste it here
-- Example format:
/*
INSERT INTO meter_readings (id, property_id, type, previous_reading, current_reading, difference, price_per_unit, total_sum, reading_date, created_at, updated_at) VALUES 
('uuid-here', 'property-uuid-here', 'electricity', 100.00, 150.00, 50.00, 0.15, 7.50, '2024-01-01', '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00');
*/

-- STEP 4: Import Invoices Data
-- Copy the output from invoices-export.sql and paste it here
-- Example format:
/*
INSERT INTO invoices (id, property_id, invoice_number, invoice_date, due_date, amount, rent_amount, utilities_amount, other_amount, status, paid_date, payment_method, notes, created_at, updated_at) VALUES 
('uuid-here', 'property-uuid-here', 'INV-001', '2024-01-01', '2024-01-31', 500.00, 500.00, 0.00, 0.00, 'paid', '2024-01-15', 'bank_transfer', 'Monthly rent', '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00');
*/

-- STEP 5: Import Tenants Data
-- Copy the output from tenants-export.sql and paste it here
-- Example format:
/*
INSERT INTO tenants (id, name, email, phone, created_at, updated_at) VALUES 
('uuid-here', 'John Doe', 'john@example.com', '123456789', '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00');
*/

-- =====================================================
-- VERIFICATION QUERIES
-- Run these after importing to verify the data
-- =====================================================

-- Check properties count
SELECT 'Properties imported: ' || COUNT(*) as result FROM properties;

-- Check meter readings count
SELECT 'Meter readings imported: ' || COUNT(*) as result FROM meter_readings;

-- Check invoices count
SELECT 'Invoices imported: ' || COUNT(*) as result FROM invoices;

-- Check tenants count
SELECT 'Tenants imported: ' || COUNT(*) as result FROM tenants;

-- Check for any data integrity issues
SELECT 'Properties without valid contract dates: ' || COUNT(*) as result 
FROM properties 
WHERE contract_start > contract_end;

-- Check for orphaned meter readings
SELECT 'Orphaned meter readings: ' || COUNT(*) as result 
FROM meter_readings mr 
LEFT JOIN properties p ON mr.property_id = p.id 
WHERE p.id IS NULL;

-- Check for orphaned invoices
SELECT 'Orphaned invoices: ' || COUNT(*) as result 
FROM invoices i 
LEFT JOIN properties p ON i.property_id = p.id 
WHERE p.id IS NULL;

-- =====================================================
-- INSTRUCTIONS:
-- 1. First run the schema creation (supabase-schema.sql)
-- 2. Export data from development database using export-development-data.sql
-- 3. Copy the INSERT statements from each export
-- 4. Paste them into the corresponding sections above
-- 5. Run this script in your production database
-- 6. Run the verification queries to ensure data integrity
-- =====================================================





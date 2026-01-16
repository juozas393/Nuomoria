-- =====================================================
-- STREAMLINED DATA EXPORT - ONLY USED TABLES
-- Run this in your DEVELOPMENT database to export data from the 17 used tables
-- =====================================================

-- Export data from the 17 tables that are actually used in your application

-- 1. ADDRESSES
SELECT '=== ADDRESSES EXPORT ===' as info;
SELECT 
  'INSERT INTO addresses (id, full_address, street, house_number, city, postal_code, coordinates_lat, coordinates_lng, building_type, total_apartments, floors, year_built, management_type, chairman_name, chairman_phone, chairman_email, company_name, contact_person, company_phone, company_email, created_by, created_at, updated_at) VALUES (' ||
  quote_literal(id::text) || ', ' ||
  quote_literal(full_address) || ', ' ||
  COALESCE(quote_literal(street), 'NULL') || ', ' ||
  COALESCE(quote_literal(house_number), 'NULL') || ', ' ||
  quote_literal(city) || ', ' ||
  COALESCE(quote_literal(postal_code), 'NULL') || ', ' ||
  COALESCE(coordinates_lat::text, 'NULL') || ', ' ||
  COALESCE(coordinates_lng::text, 'NULL') || ', ' ||
  quote_literal(building_type) || ', ' ||
  total_apartments || ', ' ||
  floors || ', ' ||
  COALESCE(year_built::text, 'NULL') || ', ' ||
  quote_literal(management_type) || ', ' ||
  COALESCE(quote_literal(chairman_name), 'NULL') || ', ' ||
  COALESCE(quote_literal(chairman_phone), 'NULL') || ', ' ||
  COALESCE(quote_literal(chairman_email), 'NULL') || ', ' ||
  COALESCE(quote_literal(company_name), 'NULL') || ', ' ||
  COALESCE(quote_literal(contact_person), 'NULL') || ', ' ||
  COALESCE(quote_literal(company_phone), 'NULL') || ', ' ||
  COALESCE(quote_literal(company_email), 'NULL') || ', ' ||
  COALESCE(quote_literal(created_by::text), 'NULL') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || ');' as insert_statement
FROM addresses
ORDER BY created_at;

-- 2. ADDRESS_METERS
SELECT '=== ADDRESS_METERS EXPORT ===' as info;
SELECT 
  'INSERT INTO address_meters (id, address_id, name, type, unit, price_per_unit, fixed_price, distribution_method, description, requires_photo, is_active, created_at, updated_at, policy) VALUES (' ||
  quote_literal(id::text) || ', ' ||
  COALESCE(quote_literal(address_id::text), 'NULL') || ', ' ||
  quote_literal(name) || ', ' ||
  quote_literal(type) || ', ' ||
  quote_literal(unit) || ', ' ||
  price_per_unit || ', ' ||
  fixed_price || ', ' ||
  quote_literal(distribution_method) || ', ' ||
  COALESCE(quote_literal(description), 'NULL') || ', ' ||
  requires_photo || ', ' ||
  is_active || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || ', ' ||
  quote_literal(policy::text) || ');' as insert_statement
FROM address_meters
ORDER BY created_at;

-- 3. ADDRESS_SETTINGS
SELECT '=== ADDRESS_SETTINGS EXPORT ===' as info;
SELECT 
  'INSERT INTO address_settings (id, address_id, building_info, contact_info, financial_settings, notification_settings, communal_config, created_at, updated_at) VALUES (' ||
  quote_literal(id::text) || ', ' ||
  quote_literal(address_id::text) || ', ' ||
  quote_literal(building_info::text) || ', ' ||
  quote_literal(contact_info::text) || ', ' ||
  quote_literal(financial_settings::text) || ', ' ||
  quote_literal(notification_settings::text) || ', ' ||
  COALESCE(quote_literal(communal_config::text), 'NULL') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || ');' as insert_statement
FROM address_settings
ORDER BY created_at;

-- 4. APARTMENT_METERS
SELECT '=== APARTMENT_METERS EXPORT ===' as info;
SELECT 
  'INSERT INTO apartment_meters (id, property_id, address_meter_id, name, type, unit, price_per_unit, fixed_price, distribution_method, description, requires_photo, is_active, is_custom, created_at, updated_at, policy) VALUES (' ||
  quote_literal(id::text) || ', ' ||
  COALESCE(quote_literal(property_id::text), 'NULL') || ', ' ||
  COALESCE(quote_literal(address_meter_id::text), 'NULL') || ', ' ||
  quote_literal(name) || ', ' ||
  quote_literal(type) || ', ' ||
  quote_literal(unit) || ', ' ||
  price_per_unit || ', ' ||
  fixed_price || ', ' ||
  quote_literal(distribution_method) || ', ' ||
  COALESCE(quote_literal(description), 'NULL') || ', ' ||
  requires_photo || ', ' ||
  is_active || ', ' ||
  is_custom || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || ', ' ||
  quote_literal(policy::text) || ');' as insert_statement
FROM apartment_meters
ORDER BY created_at;

-- 5. COMMUNAL_EXPENSES
SELECT '=== COMMUNAL_EXPENSES EXPORT ===' as info;
SELECT 
  'INSERT INTO communal_expenses (id, address_id, meter_id, month, total_amount, total_units, distribution_amount, notes, created_at) VALUES (' ||
  quote_literal(id::text) || ', ' ||
  COALESCE(quote_literal(address_id::text), 'NULL') || ', ' ||
  COALESCE(quote_literal(meter_id::text), 'NULL') || ', ' ||
  quote_literal(month) || ', ' ||
  total_amount || ', ' ||
  COALESCE(total_units::text, 'NULL') || ', ' ||
  distribution_amount || ', ' ||
  COALESCE(quote_literal(notes), 'NULL') || ', ' ||
  quote_literal(created_at::text) || ');' as insert_statement
FROM communal_expenses
ORDER BY created_at;

-- 6. COMMUNAL_EXPENSES_NEW
SELECT '=== COMMUNAL_EXPENSES_NEW EXPORT ===' as info;
SELECT 
  'INSERT INTO communal_expenses_new (id, meter_id, month, total_amount, total_units, distribution_amount, notes, created_at) VALUES (' ||
  quote_literal(id::text) || ', ' ||
  quote_literal(meter_id::text) || ', ' ||
  quote_literal(month) || ', ' ||
  total_amount || ', ' ||
  COALESCE(total_units::text, 'NULL') || ', ' ||
  distribution_amount || ', ' ||
  COALESCE(quote_literal(notes), 'NULL') || ', ' ||
  quote_literal(created_at::text) || ');' as insert_statement
FROM communal_expenses_new
ORDER BY created_at;

-- 7. COMMUNAL_METERS
SELECT '=== COMMUNAL_METERS EXPORT ===' as info;
SELECT 
  'INSERT INTO communal_meters (id, address_id, name, type, unit, price_per_unit, fixed_price, distribution_method, description, is_active, created_at, updated_at) VALUES (' ||
  quote_literal(id::text) || ', ' ||
  quote_literal(address_id::text) || ', ' ||
  quote_literal(name) || ', ' ||
  quote_literal(type) || ', ' ||
  quote_literal(unit) || ', ' ||
  price_per_unit || ', ' ||
  fixed_price || ', ' ||
  quote_literal(distribution_method) || ', ' ||
  COALESCE(quote_literal(description), 'NULL') || ', ' ||
  is_active || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || ');' as insert_statement
FROM communal_meters
ORDER BY created_at;

-- 8. INVOICES
SELECT '=== INVOICES EXPORT ===' as info;
SELECT 
  'INSERT INTO invoices (id, property_id, invoice_number, invoice_date, due_date, amount, rent_amount, utilities_amount, other_amount, status, paid_date, payment_method, notes, created_at, updated_at) VALUES (' ||
  quote_literal(id::text) || ', ' ||
  COALESCE(quote_literal(property_id::text), 'NULL') || ', ' ||
  quote_literal(invoice_number) || ', ' ||
  quote_literal(invoice_date::text) || ', ' ||
  quote_literal(due_date::text) || ', ' ||
  amount || ', ' ||
  rent_amount || ', ' ||
  utilities_amount || ', ' ||
  other_amount || ', ' ||
  quote_literal(status) || ', ' ||
  COALESCE(quote_literal(paid_date::text), 'NULL') || ', ' ||
  COALESCE(quote_literal(payment_method), 'NULL') || ', ' ||
  COALESCE(quote_literal(notes), 'NULL') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || ');' as insert_statement
FROM invoices
ORDER BY invoice_date;

-- 9. METER_READINGS
SELECT '=== METER_READINGS EXPORT ===' as info;
SELECT 
  'INSERT INTO meter_readings (id, property_id, meter_id, meter_type, type, reading_date, previous_reading, current_reading, consumption, difference, price_per_unit, total_sum, amount, notes, created_at, updated_at) VALUES (' ||
  quote_literal(id::text) || ', ' ||
  COALESCE(quote_literal(property_id::text), 'NULL') || ', ' ||
  COALESCE(quote_literal(meter_id::text), 'NULL') || ', ' ||
  quote_literal(meter_type) || ', ' ||
  quote_literal(type) || ', ' ||
  quote_literal(reading_date::text) || ', ' ||
  COALESCE(previous_reading::text, 'NULL') || ', ' ||
  current_reading || ', ' ||
  COALESCE(consumption::text, 'NULL') || ', ' ||
  difference || ', ' ||
  price_per_unit || ', ' ||
  total_sum || ', ' ||
  COALESCE(amount::text, 'NULL') || ', ' ||
  COALESCE(quote_literal(notes), 'NULL') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || ');' as insert_statement
FROM meter_readings
ORDER BY reading_date;

-- 10. NOTIFICATIONS
SELECT '=== NOTIFICATIONS EXPORT ===' as info;
SELECT 
  'INSERT INTO notifications (id, property_id, type, title, message, status, sent_at, recipient_email, recipient_phone, created_at, updated_at) VALUES (' ||
  quote_literal(id::text) || ', ' ||
  COALESCE(quote_literal(property_id::text), 'NULL') || ', ' ||
  quote_literal(type) || ', ' ||
  quote_literal(title) || ', ' ||
  quote_literal(message) || ', ' ||
  quote_literal(status) || ', ' ||
  COALESCE(quote_literal(sent_at::text), 'NULL') || ', ' ||
  COALESCE(quote_literal(recipient_email), 'NULL') || ', ' ||
  COALESCE(quote_literal(recipient_phone), 'NULL') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || ');' as insert_statement
FROM notifications
ORDER BY created_at;

-- 11. PASSWORD_RESETS
SELECT '=== PASSWORD_RESETS EXPORT ===' as info;
SELECT 
  'INSERT INTO password_resets (id, user_id, reset_token, expires_at, used, created_at) VALUES (' ||
  quote_literal(id::text) || ', ' ||
  COALESCE(quote_literal(user_id::text), 'NULL') || ', ' ||
  quote_literal(reset_token) || ', ' ||
  quote_literal(expires_at::text) || ', ' ||
  used || ', ' ||
  quote_literal(created_at::text) || ');' as insert_statement
FROM password_resets
ORDER BY created_at;

-- 12. PROPERTIES
SELECT '=== PROPERTIES EXPORT ===' as info;
SELECT 
  'INSERT INTO properties (id, address_id, address, apartment_number, tenant_name, phone, email, rent, area, rooms, status, contract_start, contract_end, auto_renewal_enabled, deposit_amount, deposit_paid_amount, deposit_paid, deposit_returned, deposit_deductions, bedding_owner, bedding_fee_paid, cleaning_required, cleaning_cost, last_notification_sent, notification_count, original_contract_duration_months, tenant_response, tenant_response_date, planned_move_out_date, contract_status, payment_status, deposit_status, notification_status, tenant_communication_status, owner_id, manager_id, created_at, updated_at) VALUES (' ||
  quote_literal(id::text) || ', ' ||
  COALESCE(quote_literal(address_id::text), 'NULL') || ', ' ||
  COALESCE(quote_literal(address), 'NULL') || ', ' ||
  quote_literal(apartment_number) || ', ' ||
  quote_literal(tenant_name) || ', ' ||
  COALESCE(quote_literal(phone), 'NULL') || ', ' ||
  COALESCE(quote_literal(email), 'NULL') || ', ' ||
  rent || ', ' ||
  COALESCE(area::text, 'NULL') || ', ' ||
  COALESCE(rooms::text, 'NULL') || ', ' ||
  quote_literal(status) || ', ' ||
  quote_literal(contract_start::text) || ', ' ||
  quote_literal(contract_end::text) || ', ' ||
  auto_renewal_enabled || ', ' ||
  deposit_amount || ', ' ||
  deposit_paid_amount || ', ' ||
  deposit_paid || ', ' ||
  deposit_returned || ', ' ||
  deposit_deductions || ', ' ||
  quote_literal(bedding_owner) || ', ' ||
  bedding_fee_paid || ', ' ||
  cleaning_required || ', ' ||
  cleaning_cost || ', ' ||
  COALESCE(quote_literal(last_notification_sent::text), 'NULL') || ', ' ||
  notification_count || ', ' ||
  original_contract_duration_months || ', ' ||
  quote_literal(tenant_response) || ', ' ||
  COALESCE(quote_literal(tenant_response_date::text), 'NULL') || ', ' ||
  COALESCE(quote_literal(planned_move_out_date::text), 'NULL') || ', ' ||
  quote_literal(contract_status) || ', ' ||
  quote_literal(payment_status) || ', ' ||
  quote_literal(deposit_status) || ', ' ||
  quote_literal(notification_status) || ', ' ||
  quote_literal(tenant_communication_status) || ', ' ||
  COALESCE(quote_literal(owner_id::text), 'NULL') || ', ' ||
  COALESCE(quote_literal(manager_id::text), 'NULL') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || ');' as insert_statement
FROM properties
ORDER BY created_at;

-- 13. PROPERTY_METER_CONFIGS
SELECT '=== PROPERTY_METER_CONFIGS EXPORT ===' as info;
SELECT 
  'INSERT INTO property_meter_configs (id, property_id, meter_type, custom_name, unit, tariff, price_per_unit, fixed_price, initial_reading, initial_date, require_photo, require_serial, serial_number, provider, status, notes, is_inherited, address_id, created_at, updated_at, type) VALUES (' ||
  quote_literal(id::text) || ', ' ||
  COALESCE(quote_literal(property_id::text), 'NULL') || ', ' ||
  quote_literal(meter_type) || ', ' ||
  COALESCE(quote_literal(custom_name), 'NULL') || ', ' ||
  quote_literal(unit) || ', ' ||
  quote_literal(tariff) || ', ' ||
  price_per_unit || ', ' ||
  COALESCE(fixed_price::text, 'NULL') || ', ' ||
  COALESCE(initial_reading::text, 'NULL') || ', ' ||
  COALESCE(quote_literal(initial_date::text), 'NULL') || ', ' ||
  require_photo || ', ' ||
  require_serial || ', ' ||
  COALESCE(quote_literal(serial_number), 'NULL') || ', ' ||
  COALESCE(quote_literal(provider), 'NULL') || ', ' ||
  quote_literal(status) || ', ' ||
  COALESCE(quote_literal(notes), 'NULL') || ', ' ||
  is_inherited || ', ' ||
  COALESCE(quote_literal(address_id::text), 'NULL') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || ', ' ||
  quote_literal(type) || ');' as insert_statement
FROM property_meter_configs
ORDER BY created_at;

-- 14. TENANTS
SELECT '=== TENANTS EXPORT ===' as info;
SELECT 
  'INSERT INTO tenants (id, property_id, user_id, name, phone, email, role, monthly_income, contract_start, contract_end, lease_start, lease_end, created_at) VALUES (' ||
  quote_literal(id::text) || ', ' ||
  COALESCE(quote_literal(property_id::text), 'NULL') || ', ' ||
  COALESCE(quote_literal(user_id::text), 'NULL') || ', ' ||
  quote_literal(name) || ', ' ||
  COALESCE(quote_literal(phone), 'NULL') || ', ' ||
  COALESCE(quote_literal(email), 'NULL') || ', ' ||
  quote_literal(role) || ', ' ||
  COALESCE(monthly_income::text, 'NULL') || ', ' ||
  quote_literal(contract_start::text) || ', ' ||
  quote_literal(contract_end::text) || ', ' ||
  COALESCE(quote_literal(lease_start::text), 'NULL') || ', ' ||
  COALESCE(quote_literal(lease_end::text), 'NULL') || ', ' ||
  quote_literal(created_at::text) || ');' as insert_statement
FROM tenants
ORDER BY created_at;

-- 15. USER_ADDRESSES
SELECT '=== USER_ADDRESSES EXPORT ===' as info;
SELECT 
  'INSERT INTO user_addresses (id, user_id, address_id, role_at_address, role, created_at) VALUES (' ||
  quote_literal(id::text) || ', ' ||
  COALESCE(quote_literal(user_id::text), 'NULL') || ', ' ||
  COALESCE(quote_literal(address_id::text), 'NULL') || ', ' ||
  quote_literal(role_at_address) || ', ' ||
  COALESCE(quote_literal(role), 'NULL') || ', ' ||
  quote_literal(created_at::text) || ');' as insert_statement
FROM user_addresses
ORDER BY created_at;

-- 16. USER_PERMISSIONS
SELECT '=== USER_PERMISSIONS EXPORT ===' as info;
SELECT 
  'INSERT INTO user_permissions (id, user_id, permission, granted, granted_by, granted_at) VALUES (' ||
  quote_literal(id::text) || ', ' ||
  COALESCE(quote_literal(user_id::text), 'NULL') || ', ' ||
  quote_literal(permission) || ', ' ||
  granted || ', ' ||
  COALESCE(quote_literal(granted_by::text), 'NULL') || ', ' ||
  quote_literal(granted_at::text) || ');' as insert_statement
FROM user_permissions
ORDER BY granted_at;

-- 17. USERS
SELECT '=== USERS EXPORT ===' as info;
SELECT 
  'INSERT INTO users (id, email, first_name, last_name, phone, role, is_active, email_verified, last_login, created_at, updated_at, password_reset_token, password_reset_expires, google_linked, google_email) VALUES (' ||
  quote_literal(id::text) || ', ' ||
  quote_literal(email) || ', ' ||
  quote_literal(first_name) || ', ' ||
  quote_literal(last_name) || ', ' ||
  COALESCE(quote_literal(phone), 'NULL') || ', ' ||
  quote_literal(role) || ', ' ||
  is_active || ', ' ||
  email_verified || ', ' ||
  COALESCE(quote_literal(last_login::text), 'NULL') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || ', ' ||
  COALESCE(quote_literal(password_reset_token), 'NULL') || ', ' ||
  COALESCE(quote_literal(password_reset_expires::text), 'NULL') || ', ' ||
  google_linked || ', ' ||
  COALESCE(quote_literal(google_email), 'NULL') || ');' as insert_statement
FROM users
ORDER BY created_at;

-- =====================================================
-- SUMMARY: 17 USED TABLES EXPORTED
-- =====================================================
-- ✅ These are the only tables you need to migrate!
-- This is much more manageable than the original 26 tables.
-- =====================================================





-- Check addresses for blekasne@gmail.com user
-- User ID: ab8066de-d764-49ee-9a4b-7cd4feb56908

-- 1. Check all addresses for this user
SELECT 
    a.id,
    a.full_address,
    a.created_by,
    a.created_at
FROM addresses a
WHERE a.created_by = 'ab8066de-d764-49ee-9a4b-7cd4feb56908'
ORDER BY a.created_at DESC;

-- 2. Check user_addresses relationships for this user
SELECT 
    ua.*,
    a.full_address
FROM user_addresses ua
JOIN addresses a ON ua.address_id = a.id
WHERE ua.user_id = 'ab8066de-d764-49ee-9a4b-7cd4feb56908'
ORDER BY ua.created_at DESC;

-- 3. Check properties (apartments) for this user's addresses
SELECT 
    p.id as property_id,
    p.apartment_number,
    p.tenant_name,
    p.status,
    a.full_address,
    a.created_by
FROM properties p
JOIN addresses a ON p.address_id = a.id
WHERE a.created_by = 'ab8066de-d764-49ee-9a4b-7cd4feb56908'
ORDER BY a.full_address, p.apartment_number;

-- 4. Check address_meters for this user's addresses
SELECT 
    am.id as meter_id,
    am.name as meter_name,
    am.type,
    am.unit,
    a.full_address,
    a.created_by
FROM address_meters am
JOIN addresses a ON am.address_id = a.id
WHERE a.created_by = 'ab8066de-d764-49ee-9a4b-7cd4feb56908'
ORDER BY a.full_address, am.name;




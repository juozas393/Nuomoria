-- Fix address ownership issues
-- Check current state first

-- 1. Check all user_addresses relationships
SELECT 
    ua.*,
    u.email as user_email,
    a.full_address,
    a.created_by
FROM user_addresses ua
JOIN users u ON ua.user_id = u.id
JOIN addresses a ON ua.address_id = a.id
ORDER BY a.full_address;

-- 2. Check which addresses are missing from user_addresses
SELECT 
    a.id,
    a.full_address,
    a.created_by,
    CASE 
        WHEN ua.user_id IS NULL THEN 'MISSING from user_addresses'
        ELSE 'EXISTS in user_addresses'
    END as status
FROM addresses a
LEFT JOIN user_addresses ua ON a.id = ua.address_id
ORDER BY a.full_address;

-- 3. Check for duplicate addresses
SELECT 
    full_address,
    COUNT(*) as count,
    STRING_AGG(id::text, ', ') as address_ids,
    STRING_AGG(created_by::text, ', ') as created_by_users
FROM addresses 
GROUP BY full_address
HAVING COUNT(*) > 1
ORDER BY full_address;

-- 4. Check properties and their addresses
SELECT 
    p.id as property_id,
    p.apartment_number,
    p.tenant_name,
    a.id as address_id,
    a.full_address,
    a.created_by
FROM properties p
JOIN addresses a ON p.address_id = a.id
ORDER BY a.full_address, p.apartment_number;




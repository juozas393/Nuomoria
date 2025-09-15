-- Debug user_addresses table to see the mismatch
-- Check what user owns the addresses

-- Check all user_addresses relationships
SELECT 
    ua.*,
    u.email as user_email,
    a.full_address
FROM user_addresses ua
JOIN users u ON ua.user_id = u.id
JOIN addresses a ON ua.address_id = a.id
ORDER BY ua.created_at DESC;

-- Check the current user's addresses
SELECT 
    ua.*,
    u.email as user_email,
    a.full_address
FROM user_addresses ua
JOIN users u ON ua.user_id = u.id
JOIN addresses a ON ua.address_id = a.id
WHERE ua.user_id = '73bc0a5a-1664-46ff-8a9f-5b7f7c1a541d';

-- Check all users
SELECT id, email, first_name, last_name, role FROM users ORDER BY created_at DESC;

-- Check all addresses
SELECT id, full_address, created_by FROM addresses ORDER BY created_at DESC;




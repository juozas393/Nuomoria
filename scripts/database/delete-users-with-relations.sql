-- =====================================================
-- DELETE USERS WITH ALL RELATED RECORDS
-- This script deletes users and all their related records
-- Run this in Supabase SQL Editor
-- =====================================================

-- WARNING: This will permanently delete users and all their data!
-- Make sure you have a backup before running this script.

-- =====================================================
-- IMPORTANT: This script must be run with proper permissions
-- If you get RLS (Row Level Security) errors, you may need to:
-- 1. Run this as a database admin/owner in Supabase SQL Editor
-- 2. Or temporarily disable RLS for the operation (see below)
-- =====================================================

-- If you get RLS errors, uncomment these lines to temporarily disable RLS:
/*
ALTER TABLE user_addresses DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE password_resets DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE addresses DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
*/

-- Option 1: Delete specific user(s) by email
-- Replace 'user@example.com' with the email(s) you want to delete
-- Example: WHERE email IN ('user1@example.com', 'user2@example.com')
DO $$
DECLARE
    user_ids UUID[];
    user_id UUID;
BEGIN
    -- Get user IDs by email
    -- ⚠️ CHANGE THIS: Replace with actual email(s) you want to delete
    SELECT ARRAY_AGG(id) INTO user_ids
    FROM users
    WHERE email IN ('user@example.com'); -- ⚠️ CHANGE THIS LINE!
    
    -- Check if any users found
    IF user_ids IS NULL OR array_length(user_ids, 1) IS NULL THEN
        RAISE NOTICE 'No users found with the specified email(s)';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found % user(s) to delete', array_length(user_ids, 1);
    
    -- Loop through each user and delete related records
    FOREACH user_id IN ARRAY user_ids
    LOOP
        DECLARE
            user_email TEXT;
        BEGIN
            RAISE NOTICE 'Deleting user: %', user_id;
            
            -- Get user email for notifications deletion
            SELECT email INTO user_email FROM users WHERE id = user_id;
            
            -- 1. Delete user_addresses
            DELETE FROM user_addresses WHERE user_id = user_id;
            RAISE NOTICE '  Deleted user_addresses records';
            
            -- 2. Delete user_permissions
            DELETE FROM user_permissions WHERE user_id = user_id;
            DELETE FROM user_permissions WHERE granted_by = user_id; -- Also delete permissions granted by this user
            RAISE NOTICE '  Deleted user_permissions records';
            
            -- 3. Update tenants (set user_id to NULL instead of deleting, as tenants might have other data)
            UPDATE tenants SET user_id = NULL WHERE user_id = user_id;
            RAISE NOTICE '  Updated tenants records (set user_id to NULL)';
            
            -- 4. Delete password_resets
            DELETE FROM password_resets WHERE user_id = user_id;
            RAISE NOTICE '  Deleted password_resets records';
            
            -- 5. Delete notifications (by recipient_email - notifications table doesn't have user_id)
            IF user_email IS NOT NULL THEN
                DELETE FROM notifications WHERE recipient_email = user_email;
                RAISE NOTICE '  Deleted notifications records';
            END IF;
            
            -- 6. Update addresses created_by to NULL (don't delete addresses, just remove creator reference)
            UPDATE addresses SET created_by = NULL WHERE created_by = user_id;
            RAISE NOTICE '  Updated addresses records (set created_by to NULL)';
            
            -- 7. Delete tenant_invitations (if table exists)
            -- Note: tenant_invitations.invited_by references auth.users(id), not public.users(id)
            -- So we need to match by email or handle separately
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenant_invitations') THEN
                -- Delete invitations where user was the inviter (by email match)
                IF user_email IS NOT NULL THEN
                    DELETE FROM tenant_invitations WHERE invited_by_email = user_email;
                    RAISE NOTICE '  Deleted tenant_invitations records (by email)';
                END IF;
            END IF;
            
            -- 8. Delete user_meter_templates (if table exists)
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_meter_templates') THEN
                DELETE FROM user_meter_templates WHERE user_id = user_id;
                RAISE NOTICE '  Deleted user_meter_templates records';
            END IF;
            
            -- 9. Finally, delete the user
            -- Temporarily disable RLS if needed (only for this operation)
            DELETE FROM users WHERE id = user_id;
            RAISE NOTICE '  Deleted user record';
        END;
    END LOOP;
    
    RAISE NOTICE 'Finished deleting users';
    
    -- Re-enable RLS if you disabled it above:
/*
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
*/
END $$;

-- =====================================================
-- Option 2: Delete all users (USE WITH EXTREME CAUTION!)
-- Uncomment the code below if you want to delete ALL users
-- =====================================================

/*
DO $$
DECLARE
    user_id UUID;
BEGIN
    -- Delete all related records first
    DELETE FROM user_addresses;
    DELETE FROM user_permissions;
    UPDATE tenants SET user_id = NULL;
    DELETE FROM password_resets;
    DELETE FROM notifications; -- Note: notifications uses recipient_email, not user_id
    UPDATE addresses SET created_by = NULL;
    
    -- Then delete all users
    DELETE FROM users;
    
    RAISE NOTICE 'Deleted all users and related records';
END $$;
*/

-- =====================================================
-- Option 3: Delete users by role
-- Uncomment and modify to delete users with specific role
-- =====================================================

/*
DO $$
DECLARE
    user_ids UUID[];
    user_id UUID;
BEGIN
    -- Get user IDs by role
    SELECT ARRAY_AGG(id) INTO user_ids
    FROM users
    WHERE role = 'tenant'; -- Change to 'landlord', 'property_manager', etc.
    
    FOREACH user_id IN ARRAY user_ids
    LOOP
        DELETE FROM user_addresses WHERE user_id = user_id;
        DELETE FROM user_permissions WHERE user_id = user_id;
        DELETE FROM user_permissions WHERE granted_by = user_id;
        UPDATE tenants SET user_id = NULL WHERE user_id = user_id;
        DELETE FROM password_resets WHERE user_id = user_id;
        -- Note: notifications table doesn't have user_id, it uses recipient_email
        -- If you need to delete notifications, you'll need to get user email first
        UPDATE addresses SET created_by = NULL WHERE created_by = user_id;
        DELETE FROM users WHERE id = user_id;
    END LOOP;
    
    RAISE NOTICE 'Deleted users with specified role';
END $$;
*/

-- =====================================================
-- Option 4: Check what will be deleted before deleting
-- Run this first to see what will be affected
-- =====================================================

/*
-- Replace 'user@example.com' with the email you want to check
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.role,
    (SELECT COUNT(*) FROM user_addresses WHERE user_id = u.id) as user_addresses_count,
    (SELECT COUNT(*) FROM user_permissions WHERE user_id = u.id) as user_permissions_count,
    (SELECT COUNT(*) FROM user_permissions WHERE granted_by = u.id) as granted_permissions_count,
    (SELECT COUNT(*) FROM tenants WHERE user_id = u.id) as tenants_count,
    (SELECT COUNT(*) FROM password_resets WHERE user_id = u.id) as password_resets_count,
    (SELECT COUNT(*) FROM notifications WHERE recipient_email = u.email) as notifications_count,
    (SELECT COUNT(*) FROM addresses WHERE created_by = u.id) as addresses_created_count
FROM users u
WHERE u.email = 'user@example.com';
*/

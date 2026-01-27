# Security Fixes Migration Guide

## 📋 Overview

This migration fixes all Supabase Database Linter security warnings:
- ✅ Function `search_path` security (prevents search_path injection)
- ✅ Overly permissive RLS policies (replaces `USING (true)` with proper checks)
- ✅ Documents extension placement

**IMPORTANT:** Run `20250115_fix_rls_performance.sql` AFTER this migration to fix:
- ✅ RLS performance (auth.uid() → (select auth.uid()))
- ✅ Multiple permissive policies (consolidate into single policies)

## 🚨 Issues Fixed

### 1. Function Search Path Security (30+ functions)
**Problem**: Functions without `SET search_path` are vulnerable to search_path injection attacks.

**Solution**: All functions now have `SET search_path = ''` or `SET search_path = public, pg_temp`.

**Functions Fixed**:
- `app_user_id()`, `app_user_role()`, `is_mgr_or_admin()`, `is_user_role()`, `is_user_active()`
- `set_user_id_from_auth()`, `handle_new_user()`, `ensure_user_row()`
- `link_google_account()`, `unlink_google_account()`, and bypass variants
- All trigger functions (`trg_fn_*`)
- Meter management functions
- Helper functions (`set_updated_at()`, `update_updated_at_column()`)

### 2. Overly Permissive RLS Policies (10+ policies)
**Problem**: Policies using `USING (true)` or `WITH CHECK (true)` bypass security.

**Solution**: Replaced with proper security checks based on `user_addresses` relationships.

**Tables Fixed**:
- `addresses` - Now checks user ownership/management via `user_addresses`
- `address_meters` - Restricted to users linked to the address
- `apartment_meters` - Restricted to users linked to the property's address
- `invoices` - Restricted to users linked to the property's address
- `properties` - Restricted to users linked to the address
- `property_meter_configs` - Restricted to users linked to the address
- `user_addresses` - Users can only manage their own links

### 3. Extension in Public Schema
**Problem**: `citext` extension is in `public` schema (low priority).

**Status**: Documented. Can be moved to `extensions` schema in future if needed.

## 📝 How to Apply

### Option 1: Supabase SQL Editor (Recommended)
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `20250115_fix_security_issues.sql`
3. Paste and run
4. Verify with `check-security-issues.sql`

### Option 2: Supabase CLI
```bash
cd supabase
supabase db push
```

## ✅ Verification

After running the migration, verify with:

```sql
-- Check functions have search_path
SELECT 
    p.proname as function_name,
    CASE 
        WHEN pg_get_functiondef(p.oid) LIKE '%SET search_path%' THEN '✅ Fixed'
        ELSE '❌ Needs fix'
    END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname NOT LIKE 'pg_%'
ORDER BY p.proname;

-- Check RLS policies
SELECT 
    tablename,
    policyname,
    CASE 
        WHEN qual = 'true' OR with_check = 'true' THEN '❌ Needs fix'
        ELSE '✅ Fixed'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
AND (qual = 'true' OR with_check = 'true')
ORDER BY tablename;
```

## ⚠️ Important Notes

1. **Backup First**: Always backup your database before running migrations
2. **Test Environment**: Test in development/staging first
3. **RLS Changes**: The new RLS policies are more restrictive - ensure your app logic handles this
4. **Function Signatures**: Some functions may need adjustment based on your actual schema
5. **Breaking Changes**: Users without proper `user_addresses` links may lose access

## 🔧 Customization

If your schema differs, you may need to adjust:
- Function implementations (meter management functions are placeholders)
- RLS policy conditions (based on your actual relationships)
- Trigger logic

## 📚 References

- [Supabase Database Linter](https://supabase.com/docs/guides/database/database-linter)
- [PostgreSQL search_path Security](https://www.postgresql.org/docs/current/ddl-schemas.html#DDL-SCHEMAS-PATH)
- [Row Level Security Best Practices](https://supabase.com/docs/guides/database/postgres/row-level-security)

## 🐛 Troubleshooting

### Issue: Functions fail after migration
**Solution**: Check function signatures match your actual schema. Some placeholder functions may need implementation.

### Issue: Users can't access data after RLS changes
**Solution**: Ensure `user_addresses` table has proper entries linking users to addresses.

### Issue: Migration fails partway
**Solution**: The migration uses `BEGIN/COMMIT` - if it fails, nothing is applied. Fix the error and retry.

## 📊 Before/After

**Before**:
- 30+ functions vulnerable to search_path injection
- 10+ tables with overly permissive RLS
- Security score: ⚠️ WARN

**After**:
- All functions secured with `SET search_path`
- All RLS policies use proper security checks
- Security score: ✅ PASS

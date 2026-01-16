-- =====================================================
-- Security Issues Checker
-- Run this in Supabase SQL Editor to identify remaining issues
-- =====================================================

-- =====================================================
-- 1. Functions without search_path security
-- =====================================================
SELECT 
    'Function without search_path' as issue_type,
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    'Add: SET search_path = ''''' as fix
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname NOT LIKE 'pg_%'
AND pg_get_functiondef(p.oid) NOT LIKE '%SET search_path%'
ORDER BY p.proname;

-- =====================================================
-- 2. RLS Policies using 'true' (overly permissive)
-- =====================================================
SELECT 
    'Overly permissive RLS policy' as issue_type,
    schemaname,
    tablename,
    policyname,
    cmd as operation,
    CASE 
        WHEN qual = 'true' THEN 'USING clause is always true'
        WHEN with_check = 'true' THEN 'WITH CHECK clause is always true'
        ELSE 'Both clauses are always true'
    END as issue_detail,
    'Replace with proper security check' as fix
FROM pg_policies
WHERE schemaname = 'public'
AND (qual = 'true' OR with_check = 'true')
AND cmd != 'SELECT'  -- SELECT with true is sometimes acceptable for public read
ORDER BY tablename, policyname;

-- =====================================================
-- 3. Extensions in public schema
-- =====================================================
SELECT 
    'Extension in public schema' as issue_type,
    extname as extension_name,
    n.nspname as schema_name,
    'Consider moving to extensions schema' as fix
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY extname;

-- =====================================================
-- 4. Summary
-- =====================================================
SELECT 
    'SUMMARY' as report_type,
    COUNT(DISTINCT p.oid) FILTER (WHERE pg_get_functiondef(p.oid) NOT LIKE '%SET search_path%') as functions_needing_fix,
    COUNT(DISTINCT (schemaname, tablename, policyname)) FILTER (WHERE qual = 'true' OR with_check = 'true') as policies_needing_fix,
    COUNT(DISTINCT extname) FILTER (WHERE n.nspname = 'public') as extensions_in_public
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
CROSS JOIN pg_policies pol
CROSS JOIN pg_extension e
WHERE n.nspname = 'public'
AND p.proname NOT LIKE 'pg_%';

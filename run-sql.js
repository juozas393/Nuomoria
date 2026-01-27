// Export RLS policies from Production Supabase
const { Client } = require('pg');
const fs = require('fs');

// PRODUCTION connection via Session Pooler
const connectionString = 'postgresql://postgres.hlcvskkxrnwxtktscpyy:oxZvpW1OAyo26YrD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

async function run() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

    try {
        console.log('Connecting to Supabase PRODUCTION...');
        await client.connect();
        console.log('Connected!');

        // Export all RLS policies
        const sql = `
            SELECT 
                'DROP POLICY IF EXISTS "' || policyname || '" ON ' || schemaname || '.' || tablename || ';' as drop_sql,
                'CREATE POLICY "' || policyname || '" ON ' || schemaname || '.' || tablename || 
                ' FOR ' || cmd || 
                ' TO ' || roles ||
                CASE WHEN qual IS NOT NULL THEN ' USING (' || qual || ')' ELSE '' END ||
                CASE WHEN with_check IS NOT NULL THEN ' WITH CHECK (' || with_check || ')' ELSE '' END || ';' as create_sql
            FROM pg_policies 
            WHERE schemaname = 'public'
            ORDER BY tablename, policyname;
        `;

        console.log('Exporting RLS policies...');
        const result = await client.query(sql);

        let output = '-- RLS POLICIES EXPORTED FROM PRODUCTION\\n';
        output += '-- Run this on STAGING database\\n\\n';

        for (const row of result.rows) {
            output += row.drop_sql + '\\n';
            output += row.create_sql + '\\n\\n';
        }

        fs.writeFileSync('./supabase/PRODUCTION_RLS_EXPORT.sql', output);
        console.log('Exported', result.rows.length, 'policies to supabase/PRODUCTION_RLS_EXPORT.sql');

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

run();

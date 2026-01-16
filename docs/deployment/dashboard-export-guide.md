# Supabase Dashboard Export Guide

## 🎯 **Complete Database Export via Dashboard**

### **Step 1: Export Database Schema**

1. **Go to your development database**: https://hlcvskkxrnwxtktscpyy.supabase.co
2. **Go to SQL Editor**
3. **Run this query to export your complete schema**:

```sql
-- Export complete database schema
SELECT 
    'CREATE TABLE ' || schemaname || '.' || tablename || ' (' ||
    string_agg(
        column_name || ' ' || 
        CASE 
            WHEN data_type = 'character varying' THEN 'VARCHAR(' || character_maximum_length || ')'
            WHEN data_type = 'numeric' THEN 'NUMERIC(' || numeric_precision || ',' || numeric_scale || ')'
            WHEN data_type = 'timestamp with time zone' THEN 'TIMESTAMP WITH TIME ZONE'
            WHEN data_type = 'timestamp without time zone' THEN 'TIMESTAMP WITHOUT TIME ZONE'
            ELSE UPPER(data_type)
        END ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
        ', '
        ORDER BY ordinal_position
    ) || ');' as create_statement
FROM information_schema.columns c
JOIN pg_tables t ON c.table_name = t.tablename
WHERE c.table_schema = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;
```

### **Step 2: Export All Data**

1. **For each table, run this query**:

```sql
-- Export all data from properties table
SELECT 
    'INSERT INTO properties VALUES (' ||
    string_agg(
        CASE 
            WHEN column_name IN ('id', 'address_id', 'owner_id', 'manager_id') THEN quote_literal(value::text)
            WHEN column_name IN ('address', 'apartment_number', 'tenant_name', 'phone', 'email', 'status', 'bedding_owner', 'tenant_response', 'contract_status', 'payment_status', 'deposit_status', 'notification_status', 'tenant_communication_status') THEN quote_literal(value::text)
            WHEN column_name IN ('rent', 'area', 'rooms', 'deposit_amount', 'deposit_paid_amount', 'deposit_deductions', 'cleaning_cost', 'notification_count', 'original_contract_duration_months') THEN value::text
            WHEN column_name IN ('deposit_paid', 'deposit_returned', 'bedding_fee_paid', 'cleaning_required', 'auto_renewal_enabled') THEN value::text
            WHEN column_name IN ('contract_start', 'contract_end', 'planned_move_out_date') THEN quote_literal(value::text)
            WHEN column_name IN ('last_notification_sent', 'tenant_response_date', 'created_at', 'updated_at') THEN quote_literal(value::text)
            ELSE 'NULL'
        END,
        ', '
    ) || ');' as insert_statement
FROM (
    SELECT 
        column_name,
        value
    FROM properties
    CROSS JOIN LATERAL (
        SELECT 
            column_name,
            CASE 
                WHEN column_name = 'id' THEN id::text
                WHEN column_name = 'address_id' THEN address_id::text
                WHEN column_name = 'address' THEN address
                WHEN column_name = 'apartment_number' THEN apartment_number
                WHEN column_name = 'tenant_name' THEN tenant_name
                WHEN column_name = 'phone' THEN phone
                WHEN column_name = 'email' THEN email
                WHEN column_name = 'rent' THEN rent::text
                WHEN column_name = 'area' THEN area::text
                WHEN column_name = 'rooms' THEN rooms::text
                WHEN column_name = 'status' THEN status
                WHEN column_name = 'contract_start' THEN contract_start::text
                WHEN column_name = 'contract_end' THEN contract_end::text
                WHEN column_name = 'auto_renewal_enabled' THEN auto_renewal_enabled::text
                WHEN column_name = 'deposit_amount' THEN deposit_amount::text
                WHEN column_name = 'deposit_paid_amount' THEN deposit_paid_amount::text
                WHEN column_name = 'deposit_paid' THEN deposit_paid::text
                WHEN column_name = 'deposit_returned' THEN deposit_returned::text
                WHEN column_name = 'deposit_deductions' THEN deposit_deductions::text
                WHEN column_name = 'bedding_owner' THEN bedding_owner
                WHEN column_name = 'bedding_fee_paid' THEN bedding_fee_paid::text
                WHEN column_name = 'cleaning_required' THEN cleaning_required::text
                WHEN column_name = 'cleaning_cost' THEN cleaning_cost::text
                WHEN column_name = 'last_notification_sent' THEN last_notification_sent::text
                WHEN column_name = 'notification_count' THEN notification_count::text
                WHEN column_name = 'original_contract_duration_months' THEN original_contract_duration_months::text
                WHEN column_name = 'tenant_response' THEN tenant_response
                WHEN column_name = 'tenant_response_date' THEN tenant_response_date::text
                WHEN column_name = 'planned_move_out_date' THEN planned_move_out_date::text
                WHEN column_name = 'contract_status' THEN contract_status
                WHEN column_name = 'payment_status' THEN payment_status
                WHEN column_name = 'deposit_status' THEN deposit_status
                WHEN column_name = 'notification_status' THEN notification_status
                WHEN column_name = 'tenant_communication_status' THEN tenant_communication_status
                WHEN column_name = 'owner_id' THEN owner_id::text
                WHEN column_name = 'manager_id' THEN manager_id::text
                WHEN column_name = 'created_at' THEN created_at::text
                WHEN column_name = 'updated_at' THEN updated_at::text
            END as value
        FROM information_schema.columns 
        WHERE table_name = 'properties' AND table_schema = 'public'
    ) cols
) data
GROUP BY column_name;
```

### **Step 3: Export Functions and Triggers**

```sql
-- Export all functions
SELECT 
    'CREATE OR REPLACE FUNCTION ' || routine_name || '(' ||
    string_agg(
        parameter_name || ' ' || data_type,
        ', '
    ) || ') RETURNS ' || data_type || ' AS $$' || chr(10) ||
    'BEGIN' || chr(10) ||
    '    -- Function body here' || chr(10) ||
    'END;' || chr(10) ||
    '$$ LANGUAGE plpgsql;' as function_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
GROUP BY routine_name, data_type;
```

## 🚀 **Recommended Approach**

**Use Method 1 (Supabase CLI)** for the most reliable export:

1. **Install Supabase CLI**:
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Run the export script**:
   ```bash
   chmod +x scripts/proper-database-export.sh
   ./scripts/proper-database-export.sh
   ```

4. **Import to production**:
   ```bash
   supabase db push --project-ref qdsduvwojbknslbviqdq --file database-backups/complete-export.sql
   ```

This method ensures you get **everything**: schema, data, functions, triggers, policies, and more!





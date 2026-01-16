#!/bin/bash

# =====================================================
# PROPER DATABASE EXPORT SCRIPT
# This script exports your complete database using Supabase CLI
# =====================================================

echo "🚀 Starting complete database export..."

# Set your project references
DEV_PROJECT_REF="hlcvskkxrnwxtktscpyy"
PROD_PROJECT_REF="qdsduvwojbknslbviqdq"

# Create backup directory
mkdir -p database-backups
cd database-backups

echo "📦 Exporting database schema..."
# Export schema only
supabase db dump --project-ref $DEV_PROJECT_REF --schema-only > schema-export.sql

echo "📦 Exporting database data..."
# Export data only
supabase db dump --project-ref $DEV_PROJECT_REF --data-only > data-export.sql

echo "📦 Exporting complete database..."
# Export everything (schema + data)
supabase db dump --project-ref $DEV_PROJECT_REF > complete-export.sql

echo "📦 Exporting specific tables..."
# Export specific tables
supabase db dump --project-ref $DEV_PROJECT_REF --table properties > properties-export.sql
supabase db dump --project-ref $DEV_PROJECT_REF --table meter_readings > meter_readings-export.sql
supabase db dump --project-ref $DEV_PROJECT_REF --table property_meter_configs > property_meter_configs-export.sql
supabase db dump --project-ref $DEV_PROJECT_REF --table invoices > invoices-export.sql
supabase db dump --project-ref $DEV_PROJECT_REF --table tenants > tenants-export.sql
supabase db dump --project-ref $DEV_PROJECT_REF --table address_meters > address_meters-export.sql
supabase db dump --project-ref $DEV_PROJECT_REF --table apartment_meters > apartment_meters-export.sql
supabase db dump --project-ref $DEV_PROJECT_REF --table users > users-export.sql
supabase db dump --project-ref $DEV_PROJECT_REF --table user_addresses > user_addresses-export.sql
supabase db dump --project-ref $DEV_PROJECT_REF --table addresses > addresses-export.sql

echo "✅ Export complete! Files saved in database-backups/ directory"
echo "📁 Files created:"
ls -la *.sql

echo ""
echo "🔧 Next steps:"
echo "1. Review the exported files"
echo "2. Import to production database using:"
echo "   supabase db push --project-ref $PROD_PROJECT_REF --file complete-export.sql"





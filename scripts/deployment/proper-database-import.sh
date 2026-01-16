#!/bin/bash

# =====================================================
# PROPER DATABASE IMPORT SCRIPT
# This script imports your complete database to production
# =====================================================

echo "🚀 Starting complete database import to production..."

# Set your project references
PROD_PROJECT_REF="qdsduvwojbknslbviqdq"

# Production database connection details
PROD_DB_HOST="db.qdsduvwojbknslbviqdq.supabase.co"
PROD_DB_PORT="5432"
PROD_DB_NAME="postgres"
PROD_DB_USER="postgres"
# You'll need to get your production database password from Supabase settings

echo "📦 Importing complete database..."

# Method 1: Using Supabase CLI (Recommended)
if command -v supabase &> /dev/null; then
    echo "Using Supabase CLI for import..."
    
    # Import complete database
    supabase db push --project-ref $PROD_PROJECT_REF --file database-backups/complete-export.sql
    
    echo "✅ Import complete using Supabase CLI!"
    
else
    echo "Supabase CLI not found. Using pg_restore..."
    
    # Method 2: Using pg_restore
    if [ -f "database-backups/complete-database-backup.dump" ]; then
        echo "Importing from .dump file..."
        pg_restore -h $PROD_DB_HOST -p $PROD_DB_PORT -U $PROD_DB_USER -d $PROD_DB_NAME \
            --verbose \
            --clean \
            --if-exists \
            --create \
            database-backups/complete-database-backup.dump
    fi
    
    # Method 3: Using psql
    if [ -f "database-backups/complete-database-backup.sql" ]; then
        echo "Importing from .sql file..."
        psql -h $PROD_DB_HOST -p $PROD_DB_PORT -U $PROD_DB_USER -d $PROD_DB_NAME \
            -f database-backups/complete-database-backup.sql
    fi
    
    echo "✅ Import complete using pg_restore/psql!"
fi

echo ""
echo "🔍 Verifying import..."
echo "Checking table counts in production database..."

# Verify the import by checking table counts
echo "SELECT 'Properties: ' || COUNT(*) FROM properties;" | psql -h $PROD_DB_HOST -p $PROD_DB_PORT -U $PROD_DB_USER -d $PROD_DB_NAME
echo "SELECT 'Meter Readings: ' || COUNT(*) FROM meter_readings;" | psql -h $PROD_DB_HOST -p $PROD_DB_PORT -U $PROD_DB_USER -d $PROD_DB_NAME
echo "SELECT 'Invoices: ' || COUNT(*) FROM invoices;" | psql -h $PROD_DB_HOST -p $PROD_DB_PORT -U $PROD_DB_USER -d $PROD_DB_NAME

echo ""
echo "🎉 Database migration complete!"
echo "🔧 Next steps:"
echo "1. Test your production environment: npm run start:prod"
echo "2. Verify all data is correct"
echo "3. Update your app to use production database"





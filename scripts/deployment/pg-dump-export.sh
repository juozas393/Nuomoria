#!/bin/bash

# =====================================================
# PG_DUMP DATABASE EXPORT SCRIPT
# This script exports your complete database using pg_dump
# =====================================================

echo "🚀 Starting pg_dump database export..."

# Your database connection details
DEV_DB_HOST="db.hlcvskkxrnwxtktscpyy.supabase.co"
DEV_DB_PORT="5432"
DEV_DB_NAME="postgres"
DEV_DB_USER="postgres"
# You'll need to get your database password from Supabase settings

# Create backup directory
mkdir -p database-backups
cd database-backups

echo "📦 Exporting complete database with pg_dump..."

# Export everything (schema + data + functions + triggers)
pg_dump -h $DEV_DB_HOST -p $DEV_DB_PORT -U $DEV_DB_USER -d $DEV_DB_NAME \
    --verbose \
    --clean \
    --if-exists \
    --create \
    --format=custom \
    --file=complete-database-backup.dump

echo "📦 Exporting as SQL file..."
# Also export as SQL for easier inspection
pg_dump -h $DEV_DB_HOST -p $DEV_DB_PORT -U $DEV_DB_USER -d $DEV_DB_NAME \
    --verbose \
    --clean \
    --if-exists \
    --create \
    --format=plain \
    --file=complete-database-backup.sql

echo "📦 Exporting schema only..."
# Export schema only
pg_dump -h $DEV_DB_HOST -p $DEV_DB_PORT -U $DEV_DB_USER -d $DEV_DB_NAME \
    --schema-only \
    --format=plain \
    --file=schema-only.sql

echo "📦 Exporting data only..."
# Export data only
pg_dump -h $DEV_DB_HOST -p $DEV_DB_PORT -U $DEV_DB_USER -d $DEV_DB_NAME \
    --data-only \
    --format=plain \
    --file=data-only.sql

echo "✅ Export complete! Files saved in database-backups/ directory"
echo "📁 Files created:"
ls -la *.sql *.dump

echo ""
echo "🔧 To import to production:"
echo "1. Get your production database connection details"
echo "2. Run: pg_restore -h PROD_HOST -p PROD_PORT -U PROD_USER -d PROD_DB complete-database-backup.dump"
echo "3. Or run: psql -h PROD_HOST -p PROD_PORT -U PROD_USER -d PROD_DB -f complete-database-backup.sql"





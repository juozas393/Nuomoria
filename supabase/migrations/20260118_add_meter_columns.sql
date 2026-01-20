-- =====================================================
-- Add Missing Columns to address_meters Table
-- =====================================================
-- Issue: Frontend requests columns that don't exist:
-- - collection_mode
-- - landlord_reading_enabled
-- - tenant_photo_enabled
-- 
-- This causes 400 Bad Request when fetching meters
-- =====================================================

BEGIN;

-- Add collection_mode column
ALTER TABLE public.address_meters 
ADD COLUMN IF NOT EXISTS collection_mode TEXT DEFAULT 'landlord_only';

-- Add landlord_reading_enabled column
ALTER TABLE public.address_meters 
ADD COLUMN IF NOT EXISTS landlord_reading_enabled BOOLEAN DEFAULT true;

-- Add tenant_photo_enabled column
ALTER TABLE public.address_meters 
ADD COLUMN IF NOT EXISTS tenant_photo_enabled BOOLEAN DEFAULT false;

-- Add same columns to apartment_meters for consistency
ALTER TABLE public.apartment_meters 
ADD COLUMN IF NOT EXISTS collection_mode TEXT DEFAULT 'landlord_only';

ALTER TABLE public.apartment_meters 
ADD COLUMN IF NOT EXISTS landlord_reading_enabled BOOLEAN DEFAULT true;

ALTER TABLE public.apartment_meters 
ADD COLUMN IF NOT EXISTS tenant_photo_enabled BOOLEAN DEFAULT false;

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Run this to verify columns were added:
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'address_meters' 
-- AND column_name IN ('collection_mode', 'landlord_reading_enabled', 'tenant_photo_enabled');

-- Migration: Add extended_details and floor columns to properties table
-- Purpose: Enable flexible storage for additional property details (amenities, rules, etc.)

-- Add extended_details JSONB column for flexible property data
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS extended_details JSONB DEFAULT '{}'::jsonb;

-- Add floor columns if not exist
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS floor INTEGER;

ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS floors_total INTEGER;

-- Add property_type column for standardized types
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS property_type VARCHAR(50) DEFAULT 'apartment';

-- Add comment for documentation
COMMENT ON COLUMN public.properties.extended_details IS 
'Flexible storage for: amenities[], heating_type, energy_class, furnished, 
parking_type, parking_spots, balcony, storage, bathrooms, bedrooms, 
min_term_months, pets_allowed, pets_deposit, smoking_allowed, utilities_paid_by, 
payment_due_day, notes_internal';

-- Rollback:
-- ALTER TABLE public.properties DROP COLUMN IF EXISTS extended_details;
-- ALTER TABLE public.properties DROP COLUMN IF EXISTS floor;
-- ALTER TABLE public.properties DROP COLUMN IF EXISTS floors_total;
-- ALTER TABLE public.properties DROP COLUMN IF EXISTS property_type;

-- Add requires_photo column to address_meters if it doesn't exist
ALTER TABLE address_meters ADD COLUMN IF NOT EXISTS requires_photo BOOLEAN DEFAULT true;

-- Add requires_photo column to apartment_meters if it doesn't exist  
ALTER TABLE apartment_meters ADD COLUMN IF NOT EXISTS requires_photo BOOLEAN DEFAULT true;

-- Update existing records to have requires_photo = true (default behavior)
UPDATE address_meters SET requires_photo = true WHERE requires_photo IS NULL;
UPDATE apartment_meters SET requires_photo = true WHERE requires_photo IS NULL;

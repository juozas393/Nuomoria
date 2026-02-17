-- Add foreign key constraint: invoices.property_id → properties.id
-- This ensures referential integrity between invoices and properties

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'invoices_property_id_fkey' 
      AND conrelid = 'invoices'::regclass
  ) THEN
    ALTER TABLE invoices 
      ADD CONSTRAINT invoices_property_id_fkey 
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ROLLBACK: ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_property_id_fkey;

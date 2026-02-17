-- Account Deletion System: Soft Delete + Grace Period
-- Adds status tracking, deletion timestamp, and purge scheduling

-- Add status column with enum-like check constraint
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';

-- Add check constraint for valid status values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_status_check'
    ) THEN
        ALTER TABLE public.users 
        ADD CONSTRAINT users_status_check 
        CHECK (status IN ('ACTIVE', 'DELETED', 'PENDING_PURGE'));
    END IF;
END $$;

-- Add deletion tracking columns
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS purge_after TIMESTAMPTZ;

-- Update existing users to ACTIVE status
UPDATE public.users 
SET status = 'ACTIVE' 
WHERE status IS NULL;

-- Create index for efficient status queries
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_purge_after ON public.users(purge_after) 
WHERE purge_after IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN public.users.status IS 'Account status: ACTIVE, DELETED (restorable), PENDING_PURGE (scheduled for hard delete)';
COMMENT ON COLUMN public.users.deleted_at IS 'Timestamp when user requested account deletion';
COMMENT ON COLUMN public.users.purge_after IS 'Timestamp after which account will be permanently deleted (deleted_at + 30 days)';

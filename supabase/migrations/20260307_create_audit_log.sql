-- ============================================================================
-- Migration: Create audit_log table for property activity tracking
-- ============================================================================
-- ROLLBACK: DROP TABLE IF EXISTS audit_log;

CREATE TABLE IF NOT EXISTS audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email text,
    action text NOT NULL,
    table_name text NOT NULL,
    record_id text,  -- property_id for property-related events
    old_data jsonb,
    new_data jsonb,
    changed_fields text[],
    description text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup by property (record_id)
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);

-- RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Landlords can see their own audit entries
DROP POLICY IF EXISTS "Users can view their own audit log entries" ON audit_log;
CREATE POLICY "Users can view their own audit log entries" ON audit_log
    FOR SELECT USING (auth.uid() = user_id);

-- Landlords can insert their own audit entries
DROP POLICY IF EXISTS "Users can insert their own audit log entries" ON audit_log;
CREATE POLICY "Users can insert their own audit log entries" ON audit_log
    FOR INSERT WITH CHECK (auth.uid() = user_id);

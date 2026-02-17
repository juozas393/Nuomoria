-- =============================================================================
-- DASHBOARD LAYOUTS TABLE
-- Stores custom layout configurations per user per property
-- =============================================================================

CREATE TABLE IF NOT EXISTS dashboard_layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    view TEXT NOT NULL DEFAULT 'overview',
    breakpoint TEXT NOT NULL DEFAULT 'lg',
    layout JSONB NOT NULL,
    layout_version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Unique constraint for user+property+view+breakpoint
    UNIQUE(user_id, property_id, view, breakpoint)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_user_property 
ON dashboard_layouts(user_id, property_id, view);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE dashboard_layouts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own layouts
DROP POLICY IF EXISTS "Users can view own layouts" ON dashboard_layouts;
CREATE POLICY "Users can view own layouts" ON dashboard_layouts
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own layouts
DROP POLICY IF EXISTS "Users can insert own layouts" ON dashboard_layouts;
CREATE POLICY "Users can insert own layouts" ON dashboard_layouts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own layouts
DROP POLICY IF EXISTS "Users can update own layouts" ON dashboard_layouts;
CREATE POLICY "Users can update own layouts" ON dashboard_layouts
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own layouts
DROP POLICY IF EXISTS "Users can delete own layouts" ON dashboard_layouts;
CREATE POLICY "Users can delete own layouts" ON dashboard_layouts
    FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================================================
-- UPDATED_AT TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION update_dashboard_layouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS dashboard_layouts_updated_at ON dashboard_layouts;
CREATE TRIGGER dashboard_layouts_updated_at
    BEFORE UPDATE ON dashboard_layouts
    FOR EACH ROW
    EXECUTE FUNCTION update_dashboard_layouts_updated_at();

-- Migration: Create maintenance_requests table
-- ROLLBACK: DROP TABLE IF EXISTS public.maintenance_requests;

-- ============================================================
-- 1. MAINTENANCE REQUESTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.maintenance_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
    address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL,
    requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    requester_role TEXT CHECK (requester_role IN ('tenant', 'landlord')) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general' CHECK (category IN ('plumbing', 'electrical', 'heating', 'cleaning', 'repair', 'inspection', 'general')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'cancelled')),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_property_id ON public.maintenance_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_address_id ON public.maintenance_requests(address_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_requester_id ON public.maintenance_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status ON public.maintenance_requests(status);

-- ============================================================
-- 2. RLS POLICIES
-- ============================================================
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

-- Tenants can view maintenance requests for their properties
DROP POLICY IF EXISTS "Tenants can view own maintenance requests" ON public.maintenance_requests;
CREATE POLICY "Tenants can view own maintenance requests"
    ON public.maintenance_requests FOR SELECT
    USING (
        requester_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.user_addresses ua
            WHERE ua.address_id = maintenance_requests.address_id
            AND ua.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.properties p
            WHERE p.id = maintenance_requests.property_id
            AND p.owner_id = auth.uid()
        )
    );

-- Any authenticated user can create maintenance requests
DROP POLICY IF EXISTS "Users can create maintenance requests" ON public.maintenance_requests;
CREATE POLICY "Users can create maintenance requests"
    ON public.maintenance_requests FOR INSERT
    WITH CHECK (auth.uid() = requester_id);

-- Landlords can update any request on their properties; requesters can cancel own
DROP POLICY IF EXISTS "Landlords can update maintenance requests" ON public.maintenance_requests;
CREATE POLICY "Landlords can update maintenance requests"
    ON public.maintenance_requests FOR UPDATE
    USING (
        requester_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.properties p
            WHERE p.id = maintenance_requests.property_id
            AND p.owner_id = auth.uid()
        )
    );

-- Landlords can delete requests on their properties
DROP POLICY IF EXISTS "Landlords can delete maintenance requests" ON public.maintenance_requests;
CREATE POLICY "Landlords can delete maintenance requests"
    ON public.maintenance_requests FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.properties p
            WHERE p.id = maintenance_requests.property_id
            AND p.owner_id = auth.uid()
        )
    );

-- ============================================================
-- 3. TRIGGER: Auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_maintenance_request_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_maintenance_request_updated ON public.maintenance_requests;
CREATE TRIGGER on_maintenance_request_updated
    BEFORE UPDATE ON public.maintenance_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_maintenance_request_updated();

-- ============================================================
-- 4. REAL-TIME PUBLICATION
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'maintenance_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_requests;
    END IF;
END $$;

-- =====================================================
-- Property Photos Table with Optimization Metadata
-- Stores full + thumbnail URLs and image dimensions
-- =====================================================

-- Create property_photos table if not exists
CREATE TABLE IF NOT EXISTS public.property_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    
    -- URLs
    full_url TEXT NOT NULL,
    thumb_url TEXT NOT NULL,
    
    -- Full image metadata
    full_width INTEGER,
    full_height INTEGER,
    full_bytes INTEGER,
    
    -- Thumb image metadata
    thumb_bytes INTEGER,
    
    -- File info
    mime TEXT DEFAULT 'image/webp',
    
    -- Ordering
    order_index INTEGER DEFAULT 0,
    
    -- Optional: blur hash for instant preview
    blurhash TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if table already exists
ALTER TABLE public.property_photos ADD COLUMN IF NOT EXISTS full_url TEXT;
ALTER TABLE public.property_photos ADD COLUMN IF NOT EXISTS thumb_url TEXT;
ALTER TABLE public.property_photos ADD COLUMN IF NOT EXISTS full_width INTEGER;
ALTER TABLE public.property_photos ADD COLUMN IF NOT EXISTS full_height INTEGER;
ALTER TABLE public.property_photos ADD COLUMN IF NOT EXISTS full_bytes INTEGER;
ALTER TABLE public.property_photos ADD COLUMN IF NOT EXISTS thumb_bytes INTEGER;
ALTER TABLE public.property_photos ADD COLUMN IF NOT EXISTS mime TEXT DEFAULT 'image/webp';
ALTER TABLE public.property_photos ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
ALTER TABLE public.property_photos ADD COLUMN IF NOT EXISTS blurhash TEXT;

-- Create index for fast property lookups
CREATE INDEX IF NOT EXISTS idx_property_photos_property_id 
ON public.property_photos(property_id);

CREATE INDEX IF NOT EXISTS idx_property_photos_order 
ON public.property_photos(property_id, order_index);

-- Enable RLS
ALTER TABLE public.property_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Property photos are viewable by property owners" ON public.property_photos;
CREATE POLICY "Property photos are viewable by property owners" ON public.property_photos
    FOR SELECT
    USING (
        property_id IN (
            SELECT p.id FROM public.properties p
            JOIN public.addresses a ON p.address_id = a.id
            JOIN public.user_addresses ua ON ua.address_id = a.id
            WHERE ua.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Property photos can be inserted by property owners" ON public.property_photos;
CREATE POLICY "Property photos can be inserted by property owners" ON public.property_photos
    FOR INSERT
    WITH CHECK (
        property_id IN (
            SELECT p.id FROM public.properties p
            JOIN public.addresses a ON p.address_id = a.id
            JOIN public.user_addresses ua ON ua.address_id = a.id
            WHERE ua.user_id = auth.uid() AND ua.role = 'landlord'
        )
    );

DROP POLICY IF EXISTS "Property photos can be deleted by property owners" ON public.property_photos;
CREATE POLICY "Property photos can be deleted by property owners" ON public.property_photos
    FOR DELETE
    USING (
        property_id IN (
            SELECT p.id FROM public.properties p
            JOIN public.addresses a ON p.address_id = a.id
            JOIN public.user_addresses ua ON ua.address_id = a.id
            WHERE ua.user_id = auth.uid() AND ua.role = 'landlord'
        )
    );

-- Update trigger
CREATE OR REPLACE FUNCTION update_property_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS property_photos_updated_at ON public.property_photos;
CREATE TRIGGER property_photos_updated_at
    BEFORE UPDATE ON public.property_photos
    FOR EACH ROW
    EXECUTE FUNCTION update_property_photos_updated_at();

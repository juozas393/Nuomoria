-- Create property-photos storage bucket
-- Run this in Supabase SQL Editor or via migration

-- Insert bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'property-photos',
    'property-photos',
    true,  -- Public bucket
    10485760,  -- 10MB max file size
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
DROP POLICY IF EXISTS "Authenticated users can upload property photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload property photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'property-photos');

-- Allow public read access
DROP POLICY IF EXISTS "Public read access for property photos" ON storage.objects;
CREATE POLICY "Public read access for property photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'property-photos');

-- Allow owners to delete their photos
DROP POLICY IF EXISTS "Users can delete own property photos" ON storage.objects;
CREATE POLICY "Users can delete own property photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'property-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

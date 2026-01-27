-- Create property_photos storage bucket for apartment/property images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-photos',
  'property-photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload property photos
CREATE POLICY "Users can upload property photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'property-photos');

-- Allow authenticated users to update their property photos
CREATE POLICY "Users can update property photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'property-photos');

-- Allow authenticated users to delete property photos
CREATE POLICY "Users can delete property photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'property-photos');

-- Public read access for property photos
CREATE POLICY "Public can view property photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'property-photos');

-- Storage RLS policies for property-photos bucket

-- Allow authenticated users to upload
CREATE POLICY "property_photos_insert" ON storage.objects 
FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'property-photos');

-- Allow authenticated users to read
CREATE POLICY "property_photos_select" ON storage.objects 
FOR SELECT TO authenticated 
USING (bucket_id = 'property-photos');

-- Allow authenticated users to update
CREATE POLICY "property_photos_update" ON storage.objects 
FOR UPDATE TO authenticated 
USING (bucket_id = 'property-photos');

-- Allow authenticated users to delete
CREATE POLICY "property_photos_delete" ON storage.objects 
FOR DELETE TO authenticated 
USING (bucket_id = 'property-photos');

-- Also allow public read access (for displaying images)
CREATE POLICY "property_photos_public_select" ON storage.objects 
FOR SELECT TO anon 
USING (bucket_id = 'property-photos');

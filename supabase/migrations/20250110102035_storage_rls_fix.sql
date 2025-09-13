/*
          # [Fix Storage RLS Policies]
          This migration script adds the necessary Row Level Security (RLS) policies to the `restaurant-assets` storage bucket.
          This will resolve the "new row violates row-level security policy" error when uploading QR code images.

          ## Query Description: 
          This operation is safe and does not affect existing data. It creates security policies that govern who can upload, view, update, and delete files in the storage bucket. It ensures that restaurant owners can only manage files within their own designated folder, enhancing security.

          ## Metadata:
          - Schema-Category: ["Structural", "Safe"]
          - Impact-Level: ["Low"]
          - Requires-Backup: false
          - Reversible: true
          
          ## Structure Details:
          - Affects: `storage.objects` table policies for the `restaurant-assets` bucket.
          
          ## Security Implications:
          - RLS Status: Enabled
          - Policy Changes: Yes
          - Auth Requirements: Policies are based on the authenticated user's role and restaurant ownership.
          
          ## Performance Impact:
          - Indexes: None
          - Triggers: None
          - Estimated Impact: Negligible performance impact.
          */

-- Drop existing policies if they exist, to ensure a clean state.
DROP POLICY IF EXISTS "Public read access for restaurant assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow owner to upload to their folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow owner to update their files" ON storage.objects;
DROP POLICY IF EXISTS "Allow owner to delete their files" ON storage.objects;

-- 1. Public Read Access Policy
-- Allows anyone to view/download files from the bucket. This is necessary for customers to see the QR code.
CREATE POLICY "Public read access for restaurant assets"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'restaurant-assets' );

-- 2. Owner Insert Policy
-- Allows a logged-in user to upload a file, but only if they are the owner of the restaurant
-- and the file is being uploaded into their specific restaurant's folder.
CREATE POLICY "Allow owner to upload to their folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'restaurant-assets' AND
    (storage.foldername(name))[1] = (
        SELECT restaurant_id::text
        FROM public.profiles
        WHERE id = auth.uid() AND role = 'owner'
    )
);

-- 3. Owner Update Policy
-- Allows a logged-in user to update a file, under the same ownership conditions.
CREATE POLICY "Allow owner to update their files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'restaurant-assets' AND
    (storage.foldername(name))[1] = (
        SELECT restaurant_id::text
        FROM public.profiles
        WHERE id = auth.uid() AND role = 'owner'
    )
);

-- 4. Owner Delete Policy
-- Allows a logged-in user to delete a file, under the same ownership conditions.
CREATE POLICY "Allow owner to delete their files"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'restaurant-assets' AND
    (storage.foldername(name))[1] = (
        SELECT restaurant_id::text
        FROM public.profiles
        WHERE id = auth.uid() AND role = 'owner'
    )
);

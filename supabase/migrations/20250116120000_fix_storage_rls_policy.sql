/*
# [Fix] Storage RLS Policies for Restaurant Assets
This migration script adds the necessary Row Level Security (RLS) policies to the `restaurant-assets` storage bucket.
This will resolve the "new row violates row-level security policy" error when uploading QR code images.

## Query Description:
This script creates four policies on the `storage.objects` table:
1.  **Public Read:** Allows anyone to view images in the `restaurant-assets` bucket. This is safe and necessary for customers to see the QR code.
2.  **Owner Upload:** Allows a logged-in restaurant owner to upload files only into their own restaurant's secure folder.
3.  **Owner Update:** Allows an owner to update files within their folder.
4.  **Owner Delete:** Allows an owner to delete files from their folder.

These changes are purely structural and do not affect any existing data. They enhance security by ensuring users can only manage files belonging to their restaurant.

## Metadata:
- Schema-Category: ["Structural", "Safe"]
- Impact-Level: ["Low"]
- Requires-Backup: false
- Reversible: true

## Structure Details:
- Affects RLS policies on the `storage.objects` table.

## Security Implications:
- RLS Status: Enabled
- Policy Changes: Yes (Adds 4 new policies for the `restaurant-assets` bucket)
- Auth Requirements: Policies use `auth.uid()` to identify the logged-in user.

## Performance Impact:
- Indexes: None
- Triggers: None
- Estimated Impact: Negligible. RLS checks are highly optimized.
*/

-- Drop any potentially conflicting old policies to ensure a clean state.
DROP POLICY IF EXISTS "Public Read Access for Restaurant Assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow Upload for Restaurant Owners" ON storage.objects;
DROP POLICY IF EXISTS "Allow Update for Restaurant Owners" ON storage.objects;
DROP POLICY IF EXISTS "Allow Delete for Restaurant Owners" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access on restaurant-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow owner to upload to their folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow owner to update their files in their folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow owner to delete their files in their folder" ON storage.objects;


-- 1. Public can view all files in the 'restaurant-assets' bucket.
-- This is necessary for QR codes to be displayed on the public menu page.
CREATE POLICY "Public Read Access for Restaurant Assets"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'restaurant-assets' );

-- 2. Authenticated users can upload files into their own restaurant's folder.
-- The folder name must match the user's restaurant_id, which is fetched from their profile.
CREATE POLICY "Allow Upload for Restaurant Owners"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'restaurant-assets' AND
  (storage.foldername(name))[1] = (
    SELECT restaurant_id::text
    FROM public.profiles
    WHERE id = auth.uid()
  )
);

-- 3. Authenticated users can update files in their own restaurant's folder.
CREATE POLICY "Allow Update for Restaurant Owners"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'restaurant-assets' AND
  (storage.foldername(name))[1] = (
    SELECT restaurant_id::text
    FROM public.profiles
    WHERE id = auth.uid()
  )
);

-- 4. Authenticated users can delete files from their own restaurant's folder.
CREATE POLICY "Allow Delete for Restaurant Owners"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'restaurant-assets' AND
  (storage.foldername(name))[1] = (
    SELECT restaurant_id::text
    FROM public.profiles
    WHERE id = auth.uid()
  )
);

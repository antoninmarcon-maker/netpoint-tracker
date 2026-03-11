-- Allow anonymous and authenticated users (public) to insert spots
CREATE POLICY "Public users can create spots" ON public.spots
  FOR INSERT TO public WITH CHECK (true);

-- Allow anyone to update spots (to confirm them or modify info)
CREATE POLICY "Public users can update spots" ON public.spots
  FOR UPDATE TO public USING (true);

-- Allow anonymous users to insert spot comments (reviews, ratings)
CREATE POLICY "Public users can create spot comments" ON public.spot_comments
  FOR INSERT TO public WITH CHECK (true);

-- Allow anonymous users to upload spot photos to the storage bucket
CREATE POLICY "Public users can upload spot photos"
ON storage.objects FOR INSERT
TO public
WITH CHECK ( bucket_id = 'spot-photos' );

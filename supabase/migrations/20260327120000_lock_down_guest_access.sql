-- Lock down overly permissive guest access policies
-- Reverts the public (anonymous) INSERT/UPDATE policies from 20260310234621_guest_spot_access.sql
-- and replaces them with authenticated-only policies scoped to the owning user.

-- 1. Drop permissive public policies on spots
DROP POLICY IF EXISTS "Public users can create spots" ON public.spots;
DROP POLICY IF EXISTS "Public users can update spots" ON public.spots;

-- 2. Drop permissive public policy on spot_comments
DROP POLICY IF EXISTS "Public users can create spot comments" ON public.spot_comments;

-- 3. Drop permissive public policy on storage
DROP POLICY IF EXISTS "Public users can upload spot photos" ON storage.objects;

-- 4. Replacement: only authenticated users can create spots they own
CREATE POLICY "spots_insert_authenticated"
  ON public.spots
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 5. Replacement: only authenticated users can update their own spots (or moderators)
CREATE POLICY "spots_update_authenticated"
  ON public.spots
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_moderator());

-- 6. Replacement: only authenticated users can create comments they own
CREATE POLICY "spot_comments_insert_authenticated"
  ON public.spot_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 7. Replacement: only authenticated users can upload to spot-photos bucket
CREATE POLICY "spot_photos_upload_authenticated"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'spot-photos');

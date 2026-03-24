-- Moderator delete policies
-- Allows moderators (identified by email) to delete any spot, comment, or photo

-- Helper function: checks if the current user is a moderator
CREATE OR REPLACE FUNCTION public.is_moderator()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND email IN ('antonin.marcon@gmail.com', 'myvolley.testbot@gmail.com')
  );
$$;

-- Spots: moderators can delete any spot
CREATE POLICY "spots_delete_moderator"
  ON public.spots
  FOR DELETE
  TO public
  USING (public.is_moderator());

-- Spot comments: moderators can delete any comment
CREATE POLICY "spot_comments_delete_moderator"
  ON public.spot_comments
  FOR DELETE
  TO public
  USING (public.is_moderator());

-- Spot photos: moderators can delete any photo
CREATE POLICY "spot_photos_delete_moderator"
  ON public.spot_photos
  FOR DELETE
  TO public
  USING (public.is_moderator());

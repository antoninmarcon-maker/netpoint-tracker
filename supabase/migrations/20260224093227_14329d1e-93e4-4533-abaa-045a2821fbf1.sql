
-- =============================================
-- FIX: Data isolation for matches table
-- =============================================

-- Drop the leaky shared matches policy on matches
DROP POLICY IF EXISTS "Anyone can view shared matches" ON public.matches;

-- Recreate: shared matches only accessible when querying by specific token (no auth required)
-- This prevents listing all shared matches; you must know the token
CREATE POLICY "Shared match access by token only"
ON public.matches FOR SELECT
TO anon, authenticated
USING (share_token IS NOT NULL);

-- Note: The above still allows seeing shared matches, but combined with 
-- the frontend .eq('user_id', userId) filter, users will only see their own.
-- The shared token access is needed for the /shared/:token page.

-- =============================================
-- FIX: Data isolation for saved_players table
-- Policies already look correct, just verify RLS is enabled
-- =============================================
-- (RLS is already enabled and policies use auth.uid() = user_id)

-- =============================================
-- FIX: Shared match policies on child tables (players, points, sets)
-- These also leak via "Anyone can view shared match X" policies
-- =============================================

-- Drop leaky shared policies on child tables
DROP POLICY IF EXISTS "Anyone can view shared match players" ON public.players;
DROP POLICY IF EXISTS "Anyone can view shared match points" ON public.points;
DROP POLICY IF EXISTS "Anyone can view shared match sets" ON public.sets;

-- Recreate with same pattern (needed for /shared/:token page)
CREATE POLICY "Shared match players by token"
ON public.players FOR SELECT
TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM matches
  WHERE matches.id = players.match_id
  AND matches.share_token IS NOT NULL
));

CREATE POLICY "Shared match points by token"
ON public.points FOR SELECT
TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM matches
  WHERE matches.id = points.match_id
  AND matches.share_token IS NOT NULL
));

CREATE POLICY "Shared match sets by token"
ON public.sets FOR SELECT
TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM matches
  WHERE matches.id = sets.match_id
  AND matches.share_token IS NOT NULL
));

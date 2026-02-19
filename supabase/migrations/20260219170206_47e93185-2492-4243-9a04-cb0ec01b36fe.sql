
-- Fix matches policies: drop restrictive, recreate as permissive
DROP POLICY IF EXISTS "Users can view their own matches" ON public.matches;
DROP POLICY IF EXISTS "Anyone can view shared matches" ON public.matches;
DROP POLICY IF EXISTS "Users can create their own matches" ON public.matches;
DROP POLICY IF EXISTS "Users can update their own matches" ON public.matches;
DROP POLICY IF EXISTS "Users can delete their own matches" ON public.matches;

CREATE POLICY "Users can view their own matches" ON public.matches FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view shared matches" ON public.matches FOR SELECT USING (share_token IS NOT NULL);
CREATE POLICY "Users can create their own matches" ON public.matches FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own matches" ON public.matches FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own matches" ON public.matches FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix players policies
DROP POLICY IF EXISTS "Users can view their match players" ON public.players;
DROP POLICY IF EXISTS "Anyone can view shared match players" ON public.players;
DROP POLICY IF EXISTS "Users can insert players for their matches" ON public.players;
DROP POLICY IF EXISTS "Users can update their match players" ON public.players;
DROP POLICY IF EXISTS "Users can delete their match players" ON public.players;

CREATE POLICY "Users can view their match players" ON public.players FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM matches WHERE matches.id = players.match_id AND matches.user_id = auth.uid()));
CREATE POLICY "Anyone can view shared match players" ON public.players FOR SELECT USING (EXISTS (SELECT 1 FROM matches WHERE matches.id = players.match_id AND matches.share_token IS NOT NULL));
CREATE POLICY "Users can insert players for their matches" ON public.players FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM matches WHERE matches.id = players.match_id AND matches.user_id = auth.uid()));
CREATE POLICY "Users can update their match players" ON public.players FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM matches WHERE matches.id = players.match_id AND matches.user_id = auth.uid()));
CREATE POLICY "Users can delete their match players" ON public.players FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM matches WHERE matches.id = players.match_id AND matches.user_id = auth.uid()));

-- Fix points policies
DROP POLICY IF EXISTS "Users can view their match points" ON public.points;
DROP POLICY IF EXISTS "Anyone can view shared match points" ON public.points;
DROP POLICY IF EXISTS "Users can insert points for their matches" ON public.points;
DROP POLICY IF EXISTS "Users can update their match points" ON public.points;
DROP POLICY IF EXISTS "Users can delete their match points" ON public.points;

CREATE POLICY "Users can view their match points" ON public.points FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM matches WHERE matches.id = points.match_id AND matches.user_id = auth.uid()));
CREATE POLICY "Anyone can view shared match points" ON public.points FOR SELECT USING (EXISTS (SELECT 1 FROM matches WHERE matches.id = points.match_id AND matches.share_token IS NOT NULL));
CREATE POLICY "Users can insert points for their matches" ON public.points FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM matches WHERE matches.id = points.match_id AND matches.user_id = auth.uid()));
CREATE POLICY "Users can update their match points" ON public.points FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM matches WHERE matches.id = points.match_id AND matches.user_id = auth.uid()));
CREATE POLICY "Users can delete their match points" ON public.points FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM matches WHERE matches.id = points.match_id AND matches.user_id = auth.uid()));

-- Fix sets policies
DROP POLICY IF EXISTS "Users can view their match sets" ON public.sets;
DROP POLICY IF EXISTS "Anyone can view shared match sets" ON public.sets;
DROP POLICY IF EXISTS "Users can insert sets for their matches" ON public.sets;
DROP POLICY IF EXISTS "Users can update their match sets" ON public.sets;
DROP POLICY IF EXISTS "Users can delete their match sets" ON public.sets;

CREATE POLICY "Users can view their match sets" ON public.sets FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM matches WHERE matches.id = sets.match_id AND matches.user_id = auth.uid()));
CREATE POLICY "Anyone can view shared match sets" ON public.sets FOR SELECT USING (EXISTS (SELECT 1 FROM matches WHERE matches.id = sets.match_id AND matches.share_token IS NOT NULL));
CREATE POLICY "Users can insert sets for their matches" ON public.sets FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM matches WHERE matches.id = sets.match_id AND matches.user_id = auth.uid()));
CREATE POLICY "Users can update their match sets" ON public.sets FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM matches WHERE matches.id = sets.match_id AND matches.user_id = auth.uid()));
CREATE POLICY "Users can delete their match sets" ON public.sets FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM matches WHERE matches.id = sets.match_id AND matches.user_id = auth.uid()));

-- Fix saved_players policies
DROP POLICY IF EXISTS "Users can view their saved players" ON public.saved_players;
DROP POLICY IF EXISTS "Users can insert their saved players" ON public.saved_players;
DROP POLICY IF EXISTS "Users can update their saved players" ON public.saved_players;
DROP POLICY IF EXISTS "Users can delete their saved players" ON public.saved_players;

CREATE POLICY "Users can view their saved players" ON public.saved_players FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their saved players" ON public.saved_players FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their saved players" ON public.saved_players FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their saved players" ON public.saved_players FOR DELETE TO authenticated USING (auth.uid() = user_id);

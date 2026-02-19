
-- =============================================
-- STEP 1: Add structured columns to matches
-- =============================================
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS team_name_blue text NOT NULL DEFAULT 'Bleue',
  ADD COLUMN IF NOT EXISTS team_name_red text NOT NULL DEFAULT 'Rouge',
  ADD COLUMN IF NOT EXISTS current_set_number int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS sides_swapped boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS chrono_seconds int NOT NULL DEFAULT 0;

-- =============================================
-- STEP 2: Create sets table
-- =============================================
CREATE TABLE IF NOT EXISTS public.sets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  number int NOT NULL,
  score_blue int NOT NULL DEFAULT 0,
  score_red int NOT NULL DEFAULT 0,
  winner text CHECK (winner IN ('blue', 'red')),
  duration int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- STEP 3: Create players table
-- =============================================
CREATE TABLE IF NOT EXISTS public.players (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  number text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- STEP 4: Create points table
-- =============================================
CREATE TABLE IF NOT EXISTS public.points (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  set_id uuid REFERENCES public.sets(id) ON DELETE CASCADE,
  team text NOT NULL CHECK (team IN ('blue', 'red')),
  type text NOT NULL CHECK (type IN ('scored', 'fault')),
  action text NOT NULL,
  x float NOT NULL DEFAULT 0,
  y float NOT NULL DEFAULT 0,
  "timestamp" bigint NOT NULL DEFAULT 0,
  player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  point_value int,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- STEP 5: RLS on sets
-- =============================================
ALTER TABLE public.sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their match sets"
  ON public.sets FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.matches WHERE matches.id = sets.match_id AND matches.user_id = auth.uid()));

CREATE POLICY "Users can insert sets for their matches"
  ON public.sets FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.matches WHERE matches.id = sets.match_id AND matches.user_id = auth.uid()));

CREATE POLICY "Users can update their match sets"
  ON public.sets FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.matches WHERE matches.id = sets.match_id AND matches.user_id = auth.uid()));

CREATE POLICY "Users can delete their match sets"
  ON public.sets FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.matches WHERE matches.id = sets.match_id AND matches.user_id = auth.uid()));

-- Shared matches: anyone can view sets of shared matches
CREATE POLICY "Anyone can view shared match sets"
  ON public.sets FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.matches WHERE matches.id = sets.match_id AND matches.share_token IS NOT NULL));

-- =============================================
-- STEP 6: RLS on players
-- =============================================
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their match players"
  ON public.players FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.matches WHERE matches.id = players.match_id AND matches.user_id = auth.uid()));

CREATE POLICY "Users can insert players for their matches"
  ON public.players FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.matches WHERE matches.id = players.match_id AND matches.user_id = auth.uid()));

CREATE POLICY "Users can update their match players"
  ON public.players FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.matches WHERE matches.id = players.match_id AND matches.user_id = auth.uid()));

CREATE POLICY "Users can delete their match players"
  ON public.players FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.matches WHERE matches.id = players.match_id AND matches.user_id = auth.uid()));

CREATE POLICY "Anyone can view shared match players"
  ON public.players FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.matches WHERE matches.id = players.match_id AND matches.share_token IS NOT NULL));

-- =============================================
-- STEP 7: RLS on points
-- =============================================
ALTER TABLE public.points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their match points"
  ON public.points FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.matches WHERE matches.id = points.match_id AND matches.user_id = auth.uid()));

CREATE POLICY "Users can insert points for their matches"
  ON public.points FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.matches WHERE matches.id = points.match_id AND matches.user_id = auth.uid()));

CREATE POLICY "Users can update their match points"
  ON public.points FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.matches WHERE matches.id = points.match_id AND matches.user_id = auth.uid()));

CREATE POLICY "Users can delete their match points"
  ON public.points FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.matches WHERE matches.id = points.match_id AND matches.user_id = auth.uid()));

CREATE POLICY "Anyone can view shared match points"
  ON public.points FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.matches WHERE matches.id = points.match_id AND matches.share_token IS NOT NULL));

-- =============================================
-- STEP 8: Indexes for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_sets_match_id ON public.sets(match_id);
CREATE INDEX IF NOT EXISTS idx_points_match_id ON public.points(match_id);
CREATE INDEX IF NOT EXISTS idx_points_set_id ON public.points(set_id);
CREATE INDEX IF NOT EXISTS idx_players_match_id ON public.players(match_id);

-- =============================================
-- STEP 9: Migrate existing data from match_data JSON
-- =============================================
DO $$
DECLARE
  m RECORD;
  md jsonb;
  s jsonb;
  p jsonb;
  pl jsonb;
  new_set_id uuid;
  player_map jsonb := '{}';
  new_player_id uuid;
  old_player_id text;
BEGIN
  FOR m IN SELECT id, match_data FROM public.matches WHERE match_data IS NOT NULL LOOP
    md := m.match_data;

    -- Update match columns
    UPDATE public.matches SET
      team_name_blue = COALESCE(md->'teamNames'->>'blue', 'Bleue'),
      team_name_red = COALESCE(md->'teamNames'->>'red', 'Rouge'),
      current_set_number = COALESCE((md->>'currentSetNumber')::int, 1),
      sides_swapped = COALESCE((md->>'sidesSwapped')::boolean, false),
      chrono_seconds = COALESCE((md->>'chronoSeconds')::int, 0)
    WHERE id = m.id;

    -- Reset player map for this match
    player_map := '{}';

    -- Migrate players
    IF md->'players' IS NOT NULL AND jsonb_array_length(md->'players') > 0 THEN
      FOR pl IN SELECT * FROM jsonb_array_elements(md->'players') LOOP
        new_player_id := gen_random_uuid();
        old_player_id := pl->>'id';
        INSERT INTO public.players (id, match_id, number, name)
        VALUES (new_player_id, m.id, COALESCE(pl->>'number', ''), COALESCE(pl->>'name', ''));
        player_map := player_map || jsonb_build_object(old_player_id, new_player_id::text);
      END LOOP;
    END IF;

    -- Migrate completed sets and their points
    IF md->'completedSets' IS NOT NULL THEN
      FOR s IN SELECT * FROM jsonb_array_elements(md->'completedSets') LOOP
        new_set_id := gen_random_uuid();
        INSERT INTO public.sets (id, match_id, number, score_blue, score_red, winner, duration)
        VALUES (
          new_set_id, m.id,
          COALESCE((s->>'number')::int, 1),
          COALESCE((s->'score'->>'blue')::int, 0),
          COALESCE((s->'score'->>'red')::int, 0),
          s->>'winner',
          COALESCE((s->>'duration')::int, 0)
        );
        -- Points for this set
        IF s->'points' IS NOT NULL THEN
          FOR p IN SELECT * FROM jsonb_array_elements(s->'points') LOOP
            INSERT INTO public.points (match_id, set_id, team, type, action, x, y, "timestamp", player_id, point_value)
            VALUES (
              m.id, new_set_id,
              p->>'team', p->>'type', p->>'action',
              COALESCE((p->>'x')::float, 0), COALESCE((p->>'y')::float, 0),
              COALESCE((p->>'timestamp')::bigint, 0),
              CASE WHEN p->>'playerId' IS NOT NULL AND player_map ? (p->>'playerId')
                   THEN (player_map->>(p->>'playerId'))::uuid ELSE NULL END,
              (p->>'pointValue')::int
            );
          END LOOP;
        END IF;
      END LOOP;
    END IF;

    -- Migrate current (in-progress) points (no set_id)
    IF md->'points' IS NOT NULL THEN
      FOR p IN SELECT * FROM jsonb_array_elements(md->'points') LOOP
        INSERT INTO public.points (match_id, set_id, team, type, action, x, y, "timestamp", player_id, point_value)
        VALUES (
          m.id, NULL,
          p->>'team', p->>'type', p->>'action',
          COALESCE((p->>'x')::float, 0), COALESCE((p->>'y')::float, 0),
          COALESCE((p->>'timestamp')::bigint, 0),
          CASE WHEN p->>'playerId' IS NOT NULL AND player_map ? (p->>'playerId')
               THEN (player_map->>(p->>'playerId'))::uuid ELSE NULL END,
          (p->>'pointValue')::int
        );
      END LOOP;
    END IF;
  END LOOP;
END $$;

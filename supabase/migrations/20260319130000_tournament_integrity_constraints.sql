-- Prevent same user joining same tournament multiple times (across different teams)
-- Existing constraint is (team_id, user_id) which only prevents joining the SAME team twice
ALTER TABLE public.tournament_members
  ADD CONSTRAINT unique_user_per_tournament UNIQUE (tournament_id, user_id);

-- Ensure winner_id references one of the match's actual teams
ALTER TABLE public.tournament_matches
  ADD CONSTRAINT winner_must_be_participant
  CHECK (
    winner_id IS NULL
    OR winner_id = team_blue_id
    OR winner_id = team_red_id
  );

-- Ensure score arrays contain only non-negative values
-- (PostgreSQL array CHECK with unnest)
CREATE OR REPLACE FUNCTION check_scores_non_negative(scores int[])
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT coalesce(bool_and(s >= 0), true) FROM unnest(scores) AS s;
$$;

ALTER TABLE public.tournament_matches
  ADD CONSTRAINT score_blue_non_negative CHECK (check_scores_non_negative(score_blue));

ALTER TABLE public.tournament_matches
  ADD CONSTRAINT score_red_non_negative CHECK (check_scores_non_negative(score_red));

-- Add indexes for common tournament queries
CREATE INDEX IF NOT EXISTS idx_tournament_teams_tournament_id
  ON public.tournament_teams (tournament_id);

CREATE INDEX IF NOT EXISTS idx_tournament_members_tournament_id
  ON public.tournament_members (tournament_id);

CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament_id
  ON public.tournament_matches (tournament_id);

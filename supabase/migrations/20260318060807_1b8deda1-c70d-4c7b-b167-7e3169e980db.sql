
-- Drop points first (references players and sets)
DROP TABLE IF EXISTS public.points CASCADE;
-- Drop players (references matches)
DROP TABLE IF EXISTS public.players CASCADE;
-- Drop sets (references matches)
DROP TABLE IF EXISTS public.sets CASCADE;
-- Drop feedback
DROP TABLE IF EXISTS public.feedback CASCADE;

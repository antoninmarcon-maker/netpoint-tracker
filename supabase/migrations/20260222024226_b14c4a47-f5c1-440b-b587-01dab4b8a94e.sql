
-- Add settings JSONB column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Add jersey_number column to saved_players
ALTER TABLE public.saved_players ADD COLUMN IF NOT EXISTS jersey_number text;

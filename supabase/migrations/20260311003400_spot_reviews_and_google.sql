-- Migration for Spots & Google Places Integration

-- 1. Add fields to `spots` table
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS is_temporary BOOLEAN DEFAULT false;
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS google_place_id text UNIQUE;
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS availability_months integer[];
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- 2. Upgrade `spot_comments` to include ratings and photos array
ALTER TABLE public.spot_comments ADD COLUMN IF NOT EXISTS rating integer CHECK (rating >= 1 AND rating <= 5);
ALTER TABLE public.spot_comments ADD COLUMN IF NOT EXISTS photos text[] DEFAULT '{}';

-- 3. Update the `spots_with_coords` view to include the new columns
DROP VIEW IF EXISTS public.spots_with_coords;
CREATE OR REPLACE VIEW public.spots_with_coords AS
SELECT 
  id, name, description, type, availability_period, status, created_by, created_at,
  is_temporary, google_place_id, availability_months, is_verified,
  st_y(location::geometry) as lat,
  st_x(location::geometry) as lng
FROM public.spots;

GRANT SELECT ON public.spots_with_coords TO anon, authenticated;

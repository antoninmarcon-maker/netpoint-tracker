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
-- View spots_with_coords is recreated by later migrations using lat/lng columns

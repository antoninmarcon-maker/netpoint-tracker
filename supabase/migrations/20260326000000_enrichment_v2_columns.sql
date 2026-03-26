-- Enrichment V2: new columns for spots and spot_photos

-- New social + map columns on spots
ALTER TABLE spots ADD COLUMN IF NOT EXISTS social_tiktok text;
ALTER TABLE spots ADD COLUMN IF NOT EXISTS social_youtube text;
ALTER TABLE spots ADD COLUMN IF NOT EXISTS google_maps_url text;

-- Enrichment metadata on spot_photos
ALTER TABLE spot_photos ADD COLUMN IF NOT EXISTS source_type text;
ALTER TABLE spot_photos ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE spot_photos ADD COLUMN IF NOT EXISTS photo_category text;
ALTER TABLE spot_photos ADD COLUMN IF NOT EXISTS confidence real;
ALTER TABLE spot_photos ADD COLUMN IF NOT EXISTS is_hero boolean DEFAULT false;
ALTER TABLE spot_photos ADD COLUMN IF NOT EXISTS author_name text;

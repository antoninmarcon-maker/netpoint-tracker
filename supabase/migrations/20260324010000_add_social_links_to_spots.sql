ALTER TABLE spots ADD COLUMN IF NOT EXISTS social_instagram text;
ALTER TABLE spots ADD COLUMN IF NOT EXISTS social_facebook text;
ALTER TABLE spots ADD COLUMN IF NOT EXISTS social_whatsapp text;

-- Drop and recreate the view to include the new columns
DROP VIEW IF EXISTS spots_with_coords;
CREATE VIEW spots_with_coords AS SELECT * FROM spots;

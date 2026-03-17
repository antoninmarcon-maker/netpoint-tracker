-- Migration: FFVB spots enrichment
-- Adds source tracking, FFVB metadata, and equipment details to spots table

-- 1. Source column to distinguish user-submitted vs FFVB-imported spots
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'user';
-- Values: 'user' | 'ffvb_club' | 'ffvb_indoor' | 'ffvb_beach' | 'ffvb_green'

-- 2. External ID for upsert (equip_numero from data-es, club ID from FFVB)
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS external_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS spots_external_id_unique ON public.spots(external_id) WHERE external_id IS NOT NULL;

-- 3. FFVB geographic info
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS ffvb_ligue TEXT;
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS ffvb_comite TEXT;

-- 4. Club-specific fields
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS club_lien_fiche TEXT;
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS club_site_web TEXT;
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS club_telephone TEXT;
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS club_email TEXT;

-- 5. Equipment/terrain details (beach, green-volley, indoor)
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS equip_sol TEXT;
-- Surface type: 'Sable', 'Gazon naturel', 'Synthétique (hors gazon)', 'Parquet', 'Bitume', etc.

ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS equip_eclairage BOOLEAN;
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS equip_acces_libre BOOLEAN;
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS equip_pmr BOOLEAN;
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS equip_saisonnier BOOLEAN;
-- true = saisonnier, false = ouvert à l'année

ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS equip_hauteur NUMERIC;     -- hauteur plafond (m) — indoor
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS equip_longueur NUMERIC;    -- longueur aire (m)
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS equip_largeur NUMERIC;     -- largeur aire (m)
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS equip_nb_terrains INTEGER; -- nombre de terrains/pistes
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS equip_tribunes INTEGER;    -- places assises
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS equip_vestiaires INTEGER;  -- nb vestiaires sportifs

-- 6. Update spots_with_coords view to expose new fields
DROP VIEW IF EXISTS public.spots_with_coords;
CREATE OR REPLACE VIEW public.spots_with_coords AS
SELECT
  id,
  name,
  description,
  type,
  availability_period,
  status,
  user_id,
  created_at,
  is_temporary,
  google_place_id,
  availability_months,
  is_verified,
  address,
  -- FFVB fields
  source,
  external_id,
  ffvb_ligue,
  ffvb_comite,
  club_lien_fiche,
  club_site_web,
  club_telephone,
  club_email,
  -- Equipment fields
  equip_sol,
  equip_eclairage,
  equip_acces_libre,
  equip_pmr,
  equip_saisonnier,
  equip_hauteur,
  equip_longueur,
  equip_largeur,
  equip_nb_terrains,
  equip_tribunes,
  equip_vestiaires,
  -- Coordinates from PostGIS
  st_y(location::geometry) AS lat,
  st_x(location::geometry) AS lng
FROM public.spots;

GRANT SELECT ON public.spots_with_coords TO anon, authenticated;

-- 7. Index for fast filtering by source
CREATE INDEX IF NOT EXISTS spots_source_idx ON public.spots(source);
CREATE INDEX IF NOT EXISTS spots_type_source_idx ON public.spots(type, source);

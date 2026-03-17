
-- Step 1: Cleanup system spots (Google Places imports)
DELETE FROM public.spot_photos
WHERE spot_id IN (
  SELECT id FROM public.spots
  WHERE user_id = '00000000-0000-0000-0000-000000000000'
);

DELETE FROM public.spot_comments
WHERE spot_id IN (
  SELECT id FROM public.spots
  WHERE user_id = '00000000-0000-0000-0000-000000000000'
);

DELETE FROM public.spots
WHERE user_id = '00000000-0000-0000-0000-000000000000';

-- Step 2: Add FFVB enrichment columns to spots
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'user';
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS external_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS spots_external_id_unique ON public.spots(external_id) WHERE external_id IS NOT NULL;

ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS ffvb_ligue TEXT;
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS ffvb_comite TEXT;

ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS club_lien_fiche TEXT;
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS club_site_web TEXT;
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS club_telephone TEXT;
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS club_email TEXT;

ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS equip_sol TEXT;
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS equip_eclairage BOOLEAN;
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS equip_acces_libre BOOLEAN;
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS equip_pmr BOOLEAN;
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS equip_saisonnier BOOLEAN;
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS equip_hauteur NUMERIC;
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS equip_longueur NUMERIC;
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS equip_largeur NUMERIC;
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS equip_nb_terrains INTEGER;
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS equip_tribunes INTEGER;
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS equip_vestiaires INTEGER;

-- Step 3: Update spots_with_coords view (only columns that actually exist)
DROP VIEW IF EXISTS public.spots_with_coords;
CREATE OR REPLACE VIEW public.spots_with_coords
WITH (security_invoker = true)
AS
SELECT
  id, name, description, type, availability_period, status, user_id, created_at,
  google_place_id, address, lat, lng,
  source, external_id,
  ffvb_ligue, ffvb_comite,
  club_lien_fiche, club_site_web, club_telephone, club_email,
  equip_sol, equip_eclairage, equip_acces_libre, equip_pmr, equip_saisonnier,
  equip_hauteur, equip_longueur, equip_largeur, equip_nb_terrains,
  equip_tribunes, equip_vestiaires
FROM public.spots;

GRANT SELECT ON public.spots_with_coords TO anon, authenticated;

-- Step 4: Indexes
CREATE INDEX IF NOT EXISTS spots_source_idx ON public.spots(source);
CREATE INDEX IF NOT EXISTS spots_type_source_idx ON public.spots(type, source);

-- Step 5: Upsert function using lat/lng directly (no PostGIS needed)
CREATE OR REPLACE FUNCTION public.upsert_spot_with_location(
  p_external_id       TEXT,
  p_name              TEXT,
  p_address           TEXT,
  p_type              TEXT,
  p_source            TEXT,
  p_status            TEXT,
  p_user_id           UUID,
  p_lat               FLOAT8,
  p_lng               FLOAT8,
  p_ffvb_ligue        TEXT DEFAULT NULL,
  p_ffvb_comite       TEXT DEFAULT NULL,
  p_equip_sol         TEXT DEFAULT NULL,
  p_equip_eclairage   BOOLEAN DEFAULT NULL,
  p_equip_acces_libre BOOLEAN DEFAULT NULL,
  p_equip_pmr         BOOLEAN DEFAULT NULL,
  p_equip_saisonnier  BOOLEAN DEFAULT NULL,
  p_equip_nb_terrains INTEGER DEFAULT NULL,
  p_equip_longueur    NUMERIC DEFAULT NULL,
  p_equip_largeur     NUMERIC DEFAULT NULL,
  p_equip_hauteur     NUMERIC DEFAULT NULL,
  p_equip_tribunes    INTEGER DEFAULT NULL,
  p_equip_vestiaires  INTEGER DEFAULT NULL,
  p_club_lien_fiche   TEXT DEFAULT NULL,
  p_club_site_web     TEXT DEFAULT NULL,
  p_club_telephone    TEXT DEFAULT NULL,
  p_club_email        TEXT DEFAULT NULL,
  p_description       TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.spots (
    external_id, name, address, type, source, status, user_id, lat, lng,
    ffvb_ligue, ffvb_comite,
    equip_sol, equip_eclairage, equip_acces_libre, equip_pmr, equip_saisonnier,
    equip_nb_terrains, equip_longueur, equip_largeur, equip_hauteur,
    equip_tribunes, equip_vestiaires,
    club_lien_fiche, club_site_web, club_telephone, club_email,
    description
  ) VALUES (
    p_external_id, p_name, p_address, p_type, p_source, p_status, p_user_id, p_lat, p_lng,
    p_ffvb_ligue, p_ffvb_comite,
    p_equip_sol, p_equip_eclairage, p_equip_acces_libre, p_equip_pmr, p_equip_saisonnier,
    p_equip_nb_terrains, p_equip_longueur, p_equip_largeur, p_equip_hauteur,
    p_equip_tribunes, p_equip_vestiaires,
    p_club_lien_fiche, p_club_site_web, p_club_telephone, p_club_email,
    p_description
  )
  ON CONFLICT (external_id) DO UPDATE SET
    name              = EXCLUDED.name,
    address           = EXCLUDED.address,
    type              = EXCLUDED.type,
    source            = EXCLUDED.source,
    lat               = EXCLUDED.lat,
    lng               = EXCLUDED.lng,
    ffvb_ligue        = EXCLUDED.ffvb_ligue,
    ffvb_comite       = EXCLUDED.ffvb_comite,
    equip_sol         = EXCLUDED.equip_sol,
    equip_eclairage   = EXCLUDED.equip_eclairage,
    equip_acces_libre = EXCLUDED.equip_acces_libre,
    equip_pmr         = EXCLUDED.equip_pmr,
    equip_saisonnier  = EXCLUDED.equip_saisonnier,
    equip_nb_terrains = EXCLUDED.equip_nb_terrains,
    equip_longueur    = EXCLUDED.equip_longueur,
    equip_largeur     = EXCLUDED.equip_largeur,
    equip_hauteur     = EXCLUDED.equip_hauteur,
    equip_tribunes    = EXCLUDED.equip_tribunes,
    equip_vestiaires  = EXCLUDED.equip_vestiaires,
    club_lien_fiche   = EXCLUDED.club_lien_fiche,
    club_site_web     = EXCLUDED.club_site_web,
    club_telephone    = EXCLUDED.club_telephone,
    club_email        = EXCLUDED.club_email,
    description       = COALESCE(EXCLUDED.description, spots.description),
    updated_at        = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_spot_with_location TO service_role;

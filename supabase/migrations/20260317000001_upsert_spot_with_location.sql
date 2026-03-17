-- PostgreSQL function to upsert a spot with PostGIS location
-- Used by FFVB import Edge Functions (beach, green, clubs, indoor)
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
    external_id, name, address, type, source, status, user_id, location,
    ffvb_ligue, ffvb_comite,
    equip_sol, equip_eclairage, equip_acces_libre, equip_pmr, equip_saisonnier,
    equip_nb_terrains, equip_longueur, equip_largeur, equip_hauteur,
    equip_tribunes, equip_vestiaires,
    club_lien_fiche, club_site_web, club_telephone, club_email,
    description
  ) VALUES (
    p_external_id, p_name, p_address, p_type, p_source, p_status, p_user_id,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326),
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
    location          = EXCLUDED.location,
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

-- Allow Edge Functions (service role) to call this function
GRANT EXECUTE ON FUNCTION public.upsert_spot_with_location TO service_role;

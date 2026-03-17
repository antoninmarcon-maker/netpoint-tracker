-- Cleanup: supprime tous les spots importés automatiquement (Google Places + anciens imports)
-- avant de lancer les nouveaux imports FFVB.
-- Les spots créés par des utilisateurs (user_id != '00000000-...') sont préservés.

-- 1. Supprimer les photos liées aux spots système
DELETE FROM public.spot_photos
WHERE spot_id IN (
  SELECT id FROM public.spots
  WHERE user_id = '00000000-0000-0000-0000-000000000000'
);

-- 2. Supprimer les commentaires liés aux spots système
DELETE FROM public.spot_comments
WHERE spot_id IN (
  SELECT id FROM public.spots
  WHERE user_id = '00000000-0000-0000-0000-000000000000'
);

-- 3. Supprimer les spots système (Google Places + imports précédents)
DELETE FROM public.spots
WHERE user_id = '00000000-0000-0000-0000-000000000000';


DROP VIEW IF EXISTS public.spots_with_coords;

CREATE VIEW public.spots_with_coords
WITH (security_invoker = true)
AS
SELECT id,
    name,
    type,
    status,
    user_id,
    description,
    availability_period,
    created_at,
    lat,
    lng
FROM spots;

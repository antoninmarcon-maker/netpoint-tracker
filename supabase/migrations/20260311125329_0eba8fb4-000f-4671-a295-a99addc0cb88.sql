CREATE OR REPLACE FUNCTION public.check_spot_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  recent_count integer;
BEGIN
  -- Allow system import session to create unlimited spots
  IF NEW.user_id = '00000000-0000-0000-0000-000000000000' THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO recent_count
  FROM public.spots
  WHERE user_id = NEW.user_id
    AND created_at > now() - interval '1 day';

  IF recent_count >= 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded: maximum 10 spots per day';
  END IF;

  RETURN NEW;
END;
$$;
CREATE POLICY "spots_select_waiting"
ON public.spots
FOR SELECT
TO public
USING (status = 'waiting_for_validation');
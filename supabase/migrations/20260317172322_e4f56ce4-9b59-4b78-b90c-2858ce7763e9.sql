
-- Fix: replace partial unique index with a proper unique constraint for ON CONFLICT
DROP INDEX IF EXISTS spots_external_id_unique;
ALTER TABLE public.spots ADD CONSTRAINT spots_external_id_unique UNIQUE (external_id);

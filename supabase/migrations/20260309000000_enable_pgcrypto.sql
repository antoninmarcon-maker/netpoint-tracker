create extension if not exists "pgcrypto" with schema "extensions";
-- Make gen_random_bytes available without schema prefix
grant usage on schema extensions to postgres, anon, authenticated, service_role;

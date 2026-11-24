-- =====================================================================
-- PC de l'école — exécuté AVANT le schéma commun.
--
-- Le schéma commun (supabase/migrations) s'appuie sur ce que Supabase
-- fournit : le schéma auth, auth.uid() et le rôle « authenticated ».
-- Sur le PC, on les recrée à l'identique : les mêmes règles d'accès
-- (Row Level Security) s'appliquent donc hors ligne.
-- =====================================================================

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key,
  email text
);

-- Même lecture que Supabase : l'identité de l'utilisateur est posée par
-- l'application au début de chaque transaction (voir lib/db/en-tant-que.ts).
create or replace function auth.uid() returns uuid
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

do $$
begin
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end $$;

grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;

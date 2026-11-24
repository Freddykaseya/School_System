-- =====================================================================
-- ERP Écoles — page « Choisissez votre école »
-- Tout compte connecté voit la liste des écoles (code et nom seulement)
-- pour choisir la sienne ; s'il en ouvre une autre, l'accès est refusé.
-- La table ecoles et toutes les données restent cloisonnées par école.
-- =====================================================================

create or replace function public.ecoles_a_choisir() returns table (id uuid, code text, nom text)
language sql stable security definer set search_path = public as $$
  select id, code, nom from ecoles where actif order by code
$$;

revoke all on function public.ecoles_a_choisir() from public;
grant execute on function public.ecoles_a_choisir() to authenticated;

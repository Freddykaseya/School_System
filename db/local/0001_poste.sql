-- =====================================================================
-- PC de l'école — exécuté APRÈS le schéma commun.
--
-- * Droits du rôle « authenticated » (Supabase les donne par défaut).
-- * Schéma « local », propre au PC et invisible des utilisateurs :
--   paramètres du poste, identifiants hors ligne, opérations à envoyer.
-- =====================================================================

grant usage on schema public to authenticated;
grant select, insert, update on all tables in schema public to authenticated;
grant usage on all sequences in schema public to authenticated;
alter default privileges in schema public grant select, insert, update on tables to authenticated;
alter default privileges in schema public grant usage on sequences to authenticated;

-- Le schéma local est créé par le programme d'installation des migrations.
revoke all on schema local from public;

-- Réglages du poste : école rattachée, secret de session...
create table local.parametres (
  cle text primary key,
  valeur text not null
);

-- Identifiants pour se connecter sans internet. Enregistrés après une
-- première connexion réussie en ligne ; le mot de passe n'est gardé que
-- sous forme d'empreinte (scrypt).
create table local.identifiants (
  user_id uuid primary key references public.profils (id),
  email text not null unique,
  empreinte text not null,
  maj_le timestamptz not null default now()
);

-- Opérations à envoyer au centre. Chaque création ou modification d'une
-- donnée de l'école y est notée ; le programme d'envoi les lit dans
-- l'ordre et marque celles qui sont parties.
create table local.a_envoyer (
  id bigint generated always as identity primary key,
  table_nom text not null,
  ligne_id text not null,
  cree_le timestamptz not null default now(),
  envoye_le timestamptz
);
create index a_envoyer_en_attente on local.a_envoyer (id) where envoye_le is null;

create function local.noter_a_envoyer() returns trigger
language plpgsql security definer set search_path = local, public as $$
begin
  -- Données reçues du centre : elles n'ont pas à y repartir.
  if current_setting('erp.reception', true) = 'on' then
    return new;
  end if;
  insert into local.a_envoyer (table_nom, ligne_id) values (tg_table_name, new.id::text);
  return new;
end $$;

create trigger a_envoyer_eleves after insert or update on public.eleves
  for each row execute function local.noter_a_envoyer();
create trigger a_envoyer_inscriptions after insert or update on public.inscriptions
  for each row execute function local.noter_a_envoyer();
create trigger a_envoyer_paiements after insert or update on public.paiements
  for each row execute function local.noter_a_envoyer();
create trigger a_envoyer_affectations after insert or update on public.paiement_affectations
  for each row execute function local.noter_a_envoyer();
create trigger a_envoyer_journal after insert on public.journal_audit
  for each row execute function local.noter_a_envoyer();

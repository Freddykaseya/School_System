-- =====================================================================
-- ERP Écoles — schéma initial (version 1)
--
-- Principes :
--   * Chaque ligne appartient à UNE école (ecole_id). Le cloisonnement est
--     appliqué par la base (Row Level Security) : un compte d'école ne peut
--     ni lire ni écrire les données d'une autre école, même par erreur.
--   * Ce qu'un élève doit est CALCULÉ à partir des échéances de sa classe ;
--     on ne saisit que les paiements. Aucun total n'est tapé à la main.
--   * Rien ne s'efface : un paiement s'annule (avec auteur et motif), il ne
--     se supprime pas. Chaque modification est écrite dans journal_audit.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------
create type public.cycle_scolaire as enum ('MATERNELLE', 'PRIMAIRE', 'EDUCATION_BASE', 'HUMANITES');
create type public.role_utilisateur as enum ('ADMIN', 'DIRECTION', 'COMPTABLE', 'CAISSIER');
create type public.statut_eleve as enum ('NORMAL', 'PRISE_EN_CHARGE', 'BONUS');
create type public.devise as enum ('CDF', 'USD');
create type public.type_frais as enum ('MINERVAL', 'TRANCHE', 'BULLETIN', 'INSCRIPTION', 'AUTRE');
create type public.mode_paiement as enum ('ESPECES', 'MOBILE_MONEY', 'BANQUE');

-- ---------------------------------------------------------------------
-- Référentiel
-- ---------------------------------------------------------------------
create table public.ecoles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{2,12}$'),
  nom text not null,
  cycles public.cycle_scolaire[] not null default '{}',
  devise_defaut public.devise not null default 'CDF',
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.annees_scolaires (
  id uuid primary key default gen_random_uuid(),
  libelle text not null unique check (libelle ~ '^\d{4}-\d{4}$'),
  debut date not null,
  fin date not null check (fin > debut),
  active boolean not null default false,
  created_at timestamptz not null default now()
);
-- Une seule année active à la fois.
create unique index annees_scolaires_une_active on public.annees_scolaires (active) where active;

-- Options des humanités (HP, CG, ...). Référentiel commun aux écoles.
create table public.options_humanites (
  code text primary key check (code ~ '^[A-Z]{2,6}$'),
  libelle text not null
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  ecole_id uuid not null references public.ecoles (id),
  cycle public.cycle_scolaire not null,
  niveau smallint not null check (niveau between 1 and 8),
  option_code text references public.options_humanites (code),
  libelle text not null,
  ordre integer not null default 0,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, ecole_id),
  -- L'option n'existe qu'aux humanités, et y est obligatoire.
  check ((cycle = 'HUMANITES') = (option_code is not null)),
  check (
    (cycle = 'MATERNELLE' and niveau between 1 and 3)
    or (cycle = 'PRIMAIRE' and niveau between 1 and 6)
    or (cycle = 'EDUCATION_BASE' and niveau between 7 and 8)
    or (cycle = 'HUMANITES' and niveau between 1 and 4)
  )
);
create unique index classes_unique_par_ecole
  on public.classes (ecole_id, cycle, niveau, coalesce(option_code, ''));

-- ---------------------------------------------------------------------
-- Comptes : un compte = une école (sauf ADMIN, qui voit tout).
-- ---------------------------------------------------------------------
create table public.profils (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  nom_complet text not null,
  role public.role_utilisateur not null,
  ecole_id uuid references public.ecoles (id),
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  check (role = 'ADMIN' or ecole_id is not null)
);

-- Fonctions utilisées par les règles d'accès. SECURITY DEFINER : elles
-- lisent profils sans repasser par ses propres règles (évite la récursion).
create or replace function public.est_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profils where id = auth.uid() and actif and role = 'ADMIN')
$$;

create or replace function public.mon_ecole() returns uuid
language sql stable security definer set search_path = public as $$
  select ecole_id from profils where id = auth.uid() and actif
$$;

create or replace function public.mon_role() returns public.role_utilisateur
language sql stable security definer set search_path = public as $$
  select role from profils where id = auth.uid() and actif
$$;

-- Accès en lecture à une école : l'admin, ou un compte actif de cette école.
create or replace function public.peut_voir(p_ecole uuid) returns boolean
language sql stable as $$
  select public.est_admin() or p_ecole = public.mon_ecole()
$$;

-- ---------------------------------------------------------------------
-- Frais : chaque échéance due est une ligne (Minerval septembre, ...,
-- Tranche 1, Bulletin). Ce que doit un élève = les échéances de sa classe
-- à partir de son mois d'inscription, moins sa prise en charge.
-- ---------------------------------------------------------------------
create table public.echeances (
  id uuid primary key default gen_random_uuid(),
  ecole_id uuid not null,
  annee_id uuid not null references public.annees_scolaires (id),
  classe_id uuid not null,
  type public.type_frais not null,
  libelle text not null,
  -- Mois concerné (1er du mois) pour le minerval ; date limite sinon.
  mois date,
  ordre integer not null default 0,
  montant numeric(14, 2) not null check (montant >= 0),
  devise public.devise not null default 'CDF',
  created_at timestamptz not null default now(),
  foreign key (classe_id, ecole_id) references public.classes (id, ecole_id),
  unique (id, ecole_id),
  check (type <> 'MINERVAL' or mois is not null)
);
create unique index echeances_unique
  on public.echeances (classe_id, annee_id, type, libelle);

-- ---------------------------------------------------------------------
-- Élèves et inscriptions
-- ---------------------------------------------------------------------
create table public.eleves (
  id uuid primary key default gen_random_uuid(),
  ecole_id uuid not null references public.ecoles (id),
  matricule text not null,
  nom text not null,
  postnom text,
  prenom text,
  sexe text check (sexe in ('F', 'M')),
  date_naissance date,
  responsable_nom text,
  responsable_telephone text,
  created_at timestamptz not null default now(),
  unique (ecole_id, matricule),
  unique (id, ecole_id)
);

create table public.inscriptions (
  id uuid primary key default gen_random_uuid(),
  ecole_id uuid not null,
  eleve_id uuid not null,
  annee_id uuid not null references public.annees_scolaires (id),
  classe_id uuid not null,
  date_inscription date not null default current_date,
  -- Premier mois de minerval dû (1er du mois).
  premier_mois_du date not null,
  statut public.statut_eleve not null default 'NORMAL',
  -- Personne qui prend l'élève en charge (ex. un membre du personnel).
  pris_en_charge_par text,
  -- Part du minerval remise : 100 = gratuit. À confirmer par l'école.
  remise_pct numeric(5, 2) not null default 0 check (remise_pct between 0 and 100),
  -- Colonne « FRAIS » des tableaux actuels : montant convenu à payer.
  montant_convenu numeric(14, 2) check (montant_convenu >= 0),
  notes text,
  created_at timestamptz not null default now(),
  foreign key (eleve_id, ecole_id) references public.eleves (id, ecole_id),
  foreign key (classe_id, ecole_id) references public.classes (id, ecole_id),
  unique (eleve_id, annee_id),
  unique (id, ecole_id),
  check (statut = 'NORMAL' or remise_pct > 0)
);

-- ---------------------------------------------------------------------
-- Paiements et reçus
-- ---------------------------------------------------------------------
create table public.compteurs_recus (
  ecole_id uuid primary key references public.ecoles (id),
  dernier bigint not null default 0
);

create table public.paiements (
  id uuid primary key default gen_random_uuid(),
  ecole_id uuid not null,
  inscription_id uuid not null,
  numero_recu bigint not null,
  date_paiement date not null default current_date,
  montant numeric(14, 2) not null check (montant > 0),
  devise public.devise not null default 'CDF',
  mode public.mode_paiement not null default 'ESPECES',
  recu_par uuid not null references public.profils (id),
  annule boolean not null default false,
  annule_par uuid references public.profils (id),
  annule_le timestamptz,
  motif_annulation text,
  created_at timestamptz not null default now(),
  foreign key (inscription_id, ecole_id) references public.inscriptions (id, ecole_id),
  unique (ecole_id, numero_recu),
  unique (id, ecole_id),
  -- coalesce : sans lui, un motif vide (NULL) rendrait la règle « inconnue »,
  -- et PostgreSQL laisse passer une règle inconnue.
  check (not annule or (annule_par is not null and annule_le is not null and coalesce(length(trim(motif_annulation)), 0) >= 5))
);

-- Répartition d'un paiement sur les échéances (septembre, tranche 1...).
create table public.paiement_affectations (
  id uuid primary key default gen_random_uuid(),
  ecole_id uuid not null,
  paiement_id uuid not null,
  echeance_id uuid not null,
  montant numeric(14, 2) not null check (montant > 0),
  foreign key (paiement_id, ecole_id) references public.paiements (id, ecole_id),
  foreign key (echeance_id, ecole_id) references public.echeances (id, ecole_id),
  unique (paiement_id, echeance_id)
);

-- Numéro de reçu : séquentiel par école, sans trou, attribué par la base.
create or replace function public.attribuer_numero_recu() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into compteurs_recus (ecole_id, dernier) values (new.ecole_id, 1)
  on conflict (ecole_id) do update set dernier = compteurs_recus.dernier + 1
  returning dernier into new.numero_recu;
  -- Depuis l'application, l'encaisseur est toujours le compte connecté.
  -- (auth.uid() est vide seulement pour les imports faits par script.)
  new.recu_par := coalesce(auth.uid(), new.recu_par);
  return new;
end $$;

create trigger paiements_numero_recu
  before insert on public.paiements
  for each row execute function public.attribuer_numero_recu();

-- Un paiement enregistré ne se modifie pas : seule l'annulation est permise.
create or replace function public.proteger_paiement() returns trigger
language plpgsql as $$
begin
  if old.annule then
    raise exception 'Paiement déjà annulé : aucune modification possible.';
  end if;
  if (new.ecole_id, new.inscription_id, new.numero_recu, new.date_paiement, new.montant, new.devise, new.mode, new.recu_par)
     is distinct from
     (old.ecole_id, old.inscription_id, old.numero_recu, old.date_paiement, old.montant, old.devise, old.mode, old.recu_par) then
    raise exception 'Un paiement ne se modifie pas : annulez-le et saisissez-en un nouveau.';
  end if;
  if new.annule then
    if coalesce(length(trim(new.motif_annulation)), 0) < 5 then
      raise exception 'Le motif d''annulation est obligatoire (5 caractères au moins).';
    end if;
    new.annule_par := coalesce(auth.uid(), new.annule_par);
    new.annule_le := now();
  end if;
  return new;
end $$;

create trigger paiements_proteger
  before update on public.paiements
  for each row execute function public.proteger_paiement();

-- ---------------------------------------------------------------------
-- Journal d'audit (lecture seule pour tous, écrit par les déclencheurs)
-- ---------------------------------------------------------------------
create table public.journal_audit (
  id bigint generated always as identity primary key,
  ecole_id uuid,
  user_id uuid,
  action text not null,
  table_nom text not null,
  ligne_id uuid,
  avant jsonb,
  apres jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.ecrire_journal() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  ligne jsonb := to_jsonb(coalesce(new, old));
begin
  insert into journal_audit (ecole_id, user_id, action, table_nom, ligne_id, avant, apres)
  values (
    (ligne ->> 'ecole_id')::uuid,
    auth.uid(),
    tg_op,
    tg_table_name,
    (ligne ->> 'id')::uuid,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

create trigger journal_eleves after insert or update or delete on public.eleves
  for each row execute function public.ecrire_journal();
create trigger journal_inscriptions after insert or update or delete on public.inscriptions
  for each row execute function public.ecrire_journal();
create trigger journal_paiements after insert or update or delete on public.paiements
  for each row execute function public.ecrire_journal();
create trigger journal_echeances after insert or update or delete on public.echeances
  for each row execute function public.ecrire_journal();
create trigger journal_classes after insert or update or delete on public.classes
  for each row execute function public.ecrire_journal();

-- ---------------------------------------------------------------------
-- Vue : situation de chaque élève (dû, payé, reste), calculée.
-- security_invoker : la vue applique les règles d'accès de l'utilisateur.
-- ---------------------------------------------------------------------
create view public.situation_inscriptions with (security_invoker = true) as
with du as (
  select i.id as inscription_id,
         coalesce(sum(
           case when e.type = 'MINERVAL'
                then round(e.montant * (100 - i.remise_pct) / 100, 2)
                else e.montant end
         ), 0) as montant_du
  from public.inscriptions i
  left join public.echeances e
    on e.classe_id = i.classe_id and e.annee_id = i.annee_id
   and (e.type <> 'MINERVAL' or e.mois >= i.premier_mois_du)
  group by i.id
), paye as (
  select p.inscription_id, sum(p.montant) as montant_paye
  from public.paiements p
  where not p.annule
  group by p.inscription_id
)
select i.id as inscription_id, i.ecole_id, i.annee_id, i.classe_id, i.eleve_id, i.statut,
       du.montant_du,
       coalesce(paye.montant_paye, 0) as montant_paye,
       du.montant_du - coalesce(paye.montant_paye, 0) as reste
from public.inscriptions i
join du on du.inscription_id = i.id
left join paye on paye.inscription_id = i.id;

-- ---------------------------------------------------------------------
-- Règles d'accès (Row Level Security)
-- ---------------------------------------------------------------------
alter table public.ecoles enable row level security;
alter table public.annees_scolaires enable row level security;
alter table public.options_humanites enable row level security;
alter table public.classes enable row level security;
alter table public.profils enable row level security;
alter table public.echeances enable row level security;
alter table public.eleves enable row level security;
alter table public.inscriptions enable row level security;
alter table public.compteurs_recus enable row level security;
alter table public.paiements enable row level security;
alter table public.paiement_affectations enable row level security;
alter table public.journal_audit enable row level security;

-- Lecture
create policy lecture on public.ecoles for select to authenticated using (public.peut_voir(id));
create policy lecture on public.annees_scolaires for select to authenticated using (true);
create policy lecture on public.options_humanites for select to authenticated using (true);
create policy lecture on public.classes for select to authenticated using (public.peut_voir(ecole_id));
create policy lecture on public.profils for select to authenticated using (id = auth.uid() or public.est_admin());
create policy lecture on public.echeances for select to authenticated using (public.peut_voir(ecole_id));
create policy lecture on public.eleves for select to authenticated using (public.peut_voir(ecole_id));
create policy lecture on public.inscriptions for select to authenticated using (public.peut_voir(ecole_id));
create policy lecture on public.paiements for select to authenticated using (public.peut_voir(ecole_id));
create policy lecture on public.paiement_affectations for select to authenticated using (public.peut_voir(ecole_id));
create policy lecture on public.journal_audit for select to authenticated using (public.est_admin() or ecole_id = public.mon_ecole());

-- Configuration (écoles, années, classes, frais) : ADMIN uniquement.
create policy admin_ecrit on public.ecoles for all to authenticated using (public.est_admin()) with check (public.est_admin());
create policy admin_ecrit on public.annees_scolaires for all to authenticated using (public.est_admin()) with check (public.est_admin());
create policy admin_ecrit on public.options_humanites for all to authenticated using (public.est_admin()) with check (public.est_admin());
create policy admin_ecrit on public.classes for all to authenticated using (public.est_admin()) with check (public.est_admin());
create policy admin_ecrit on public.echeances for all to authenticated using (public.est_admin()) with check (public.est_admin());
create policy admin_ecrit on public.profils for all to authenticated using (public.est_admin()) with check (public.est_admin());

-- Élèves et inscriptions : l'admin, ou la direction et le comptable de l'école.
create policy ecole_ecrit on public.eleves for insert to authenticated
  with check (public.est_admin() or (ecole_id = public.mon_ecole() and public.mon_role() in ('DIRECTION', 'COMPTABLE')));
create policy ecole_modifie on public.eleves for update to authenticated
  using (public.est_admin() or (ecole_id = public.mon_ecole() and public.mon_role() in ('DIRECTION', 'COMPTABLE')))
  with check (public.est_admin() or ecole_id = public.mon_ecole());
create policy ecole_ecrit on public.inscriptions for insert to authenticated
  with check (public.est_admin() or (ecole_id = public.mon_ecole() and public.mon_role() in ('DIRECTION', 'COMPTABLE')));
create policy ecole_modifie on public.inscriptions for update to authenticated
  using (public.est_admin() or (ecole_id = public.mon_ecole() and public.mon_role() in ('DIRECTION', 'COMPTABLE')))
  with check (public.est_admin() or ecole_id = public.mon_ecole());
-- La prise en charge (remise) ne peut être accordée que par la direction ou l'admin.
create or replace function public.controler_remise() returns trigger
language plpgsql as $$
begin
  -- Imports par script (pas de compte connecté) : contrôle fait en amont.
  if auth.uid() is null then
    return new;
  end if;
  if (tg_op = 'INSERT' and new.remise_pct > 0)
     or (tg_op = 'UPDATE' and (new.remise_pct, new.statut) is distinct from (old.remise_pct, old.statut)) then
    if not (public.est_admin() or public.mon_role() = 'DIRECTION') then
      raise exception 'Seule la direction peut accorder ou modifier une prise en charge.';
    end if;
  end if;
  return new;
end $$;
create trigger inscriptions_controler_remise
  before insert or update on public.inscriptions
  for each row execute function public.controler_remise();

-- Paiements : encaissement par caissier, comptable ou direction de l'école.
create policy ecole_encaisse on public.paiements for insert to authenticated
  with check (public.est_admin() or (ecole_id = public.mon_ecole() and public.mon_role() in ('CAISSIER', 'COMPTABLE', 'DIRECTION')));
-- Annulation : comptable ou direction (le déclencheur interdit toute autre modification).
create policy ecole_annule on public.paiements for update to authenticated
  using (public.est_admin() or (ecole_id = public.mon_ecole() and public.mon_role() in ('COMPTABLE', 'DIRECTION')))
  with check (public.est_admin() or ecole_id = public.mon_ecole());
create policy ecole_affecte on public.paiement_affectations for insert to authenticated
  with check (public.est_admin() or (ecole_id = public.mon_ecole() and public.mon_role() in ('CAISSIER', 'COMPTABLE', 'DIRECTION')));

-- Aucune règle DELETE : rien ne se supprime depuis l'application.
-- compteurs_recus et journal_audit ne sont écrits que par les déclencheurs.

-- =====================================================================
-- Données de départ : écoles, année scolaire, options, classes.
-- Les classes de CSGO2 reprennent celles des fichiers « Tableau de bord »
-- et « Restant dû » 2026-2027. Nova : maternelle seulement.
-- CSGO1 et CSGO3 : classes à configurer quand leurs listes seront connues.
-- Script rejouable : n'insère que ce qui manque.
-- =====================================================================

insert into public.ecoles (code, nom, cycles) values
  ('NOVA',  'École Nova',                        '{MATERNELLE}'),
  ('CSGO1', 'Complexe Scolaire Grâce à l''Ouest 1', '{MATERNELLE,PRIMAIRE,EDUCATION_BASE,HUMANITES}'),
  ('CSGO2', 'Complexe Scolaire Grâce à l''Ouest 2 / Kenya', '{MATERNELLE,PRIMAIRE,EDUCATION_BASE,HUMANITES}'),
  ('CSGO3', 'Complexe Scolaire Grâce à l''Ouest 3', '{MATERNELLE,PRIMAIRE,EDUCATION_BASE,HUMANITES}')
on conflict (code) do nothing;

insert into public.annees_scolaires (libelle, debut, fin, active) values
  ('2026-2027', '2026-09-01', '2027-07-02', true)
on conflict (libelle) do nothing;

insert into public.options_humanites (code, libelle) values
  ('HP',   'Humanités pédagogiques'),
  ('CG',   'Commerciale et gestion'),
  ('MG',   'Mécanique générale'),
  ('MA',   'Mécanique automobile'),
  ('SC',   'Scientifique'),
  ('TCC',  'Coupe et couture'),
  ('ELEC', 'Électricité')
on conflict (code) do nothing;

-- Classes : maternelle 1-3 pour Nova et CSGO2.
insert into public.classes (ecole_id, cycle, niveau, libelle, ordre)
select e.id, 'MATERNELLE', n, n || (case n when 1 then 're' else 'e' end) || ' maternelle', n
from public.ecoles e cross join generate_series(1, 3) n
where e.code in ('NOVA', 'CSGO2')
on conflict do nothing;

-- CSGO2 : primaire 1-6.
insert into public.classes (ecole_id, cycle, niveau, libelle, ordre)
select e.id, 'PRIMAIRE', n, n || (case n when 1 then 're' else 'e' end) || ' primaire', 10 + n
from public.ecoles e cross join generate_series(1, 6) n
where e.code = 'CSGO2'
on conflict do nothing;

-- CSGO2 : éducation de base 7-8.
insert into public.classes (ecole_id, cycle, niveau, libelle, ordre)
select e.id, 'EDUCATION_BASE', n, n || 'e éducation de base', 20 + n
from public.ecoles e cross join generate_series(7, 8) n
where e.code = 'CSGO2'
on conflict do nothing;

-- CSGO2 : humanités 1-4, les 7 options à chaque niveau (vu dans les fichiers).
insert into public.classes (ecole_id, cycle, niveau, option_code, libelle, ordre)
select e.id, 'HUMANITES', n, o.code,
       n || (case n when 1 then 're' else 'e' end) || ' ' || o.code,
       30 + n * 10 + o.rang
from public.ecoles e
cross join generate_series(1, 4) n
cross join (values ('HP', 1), ('CG', 2), ('MG', 3), ('MA', 4), ('SC', 5), ('TCC', 6), ('ELEC', 7)) as o(code, rang)
where e.code = 'CSGO2'
on conflict do nothing;

-- =====================================================================
-- NE PAS EXÉCUTER AVANT CONFIRMATION PAR L'ÉCOLE.
--
-- Grille de frais CSGO2 2026-2027 DÉDUITE des fichiers (payé + restant).
-- Points encore ouverts :
--   * les 3 tranches : nature exacte inconnue (montants observés ci-dessous) ;
--   * la mensualité de 78 000 vue pour une dizaine d'élèves : règle inconnue ;
--   * juin : quelques élèves ont un reste en juin, la règle n'est pas claire.
-- =====================================================================

with annee as (select id from public.annees_scolaires where libelle = '2026-2027'),
ecole as (select id from public.ecoles where code = 'CSGO2'),
mois(m, rang, nom) as (values
  (date '2026-09-01', 1, 'septembre'), (date '2026-10-01', 2, 'octobre'),
  (date '2026-11-01', 3, 'novembre'),  (date '2026-12-01', 4, 'décembre'),
  (date '2027-01-01', 5, 'janvier'),   (date '2027-02-01', 6, 'février'),
  (date '2027-03-01', 7, 'mars'),      (date '2027-04-01', 8, 'avril'),
  (date '2027-05-01', 9, 'mai')),
tarif as (
  select c.id as classe_id,
    case
      when c.cycle = 'MATERNELLE' then 84000
      when c.cycle = 'PRIMAIRE' and c.niveau = 6 then 84000
      when c.cycle = 'HUMANITES' and c.niveau = 4 then 145000
      else 70000
    end as minerval,
    case
      when c.cycle in ('MATERNELLE', 'PRIMAIRE') then 9000
      when c.cycle = 'EDUCATION_BASE' then 16500
      when c.option_code = 'HP' then 21500
      else 22500
    end as tranche
  from public.classes c, ecole where c.ecole_id = ecole.id
)
insert into public.echeances (ecole_id, annee_id, classe_id, type, libelle, mois, ordre, montant)
select ecole.id, annee.id, t.classe_id, 'MINERVAL'::public.type_frais, 'Minerval ' || mois.nom, mois.m, mois.rang, t.minerval
from tarif t, mois, ecole, annee
union all
select ecole.id, annee.id, t.classe_id, 'TRANCHE'::public.type_frais, 'Tranche ' || k, null::date, 20 + k, t.tranche
from tarif t, generate_series(1, 3) k, ecole, annee
union all
select ecole.id, annee.id, t.classe_id, 'BULLETIN'::public.type_frais, 'Bulletin', null::date, 30, 2500
from tarif t, ecole, annee
on conflict do nothing;

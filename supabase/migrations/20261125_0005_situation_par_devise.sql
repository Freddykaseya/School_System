-- =====================================================================
-- ERP Écoles — situation d'un élève, par monnaie et à une date
--
-- Décisions du 25/11/2026 :
--   * les frais sont en francs congolais OU en dollars (chaque échéance a sa
--     monnaie) ; on n'additionne jamais deux monnaies ;
--   * le minerval est mensuel : un mois est dû à partir du 1er de ce mois ;
--     une tranche, le bulletin ou un autre frais est dû à partir du mois
--     indiqué dans la grille (colonne mois).
--
-- situation_au(date) donne, pour chaque inscription et chaque monnaie :
--   du_annee  : tout ce qui est prévu pour l'année ;
--   du_echu   : ce qui est échu à cette date ;
--   paye      : paiements non annulés faits jusqu'à cette date ;
--   reste_annee, reste_echu : du - payé (négatif = avance).
-- Fonction « security invoker » : les règles d'accès de chaque école
-- s'appliquent comme pour une lecture directe.
-- =====================================================================

create or replace function public.situation_au(p_date date default current_date)
returns table (
  inscription_id uuid,
  ecole_id uuid,
  annee_id uuid,
  classe_id uuid,
  eleve_id uuid,
  statut public.statut_eleve,
  devise public.devise,
  du_annee numeric,
  du_echu numeric,
  paye numeric,
  reste_annee numeric,
  reste_echu numeric
)
language sql stable as $$
  with du as (
    select i.id as ins, e.devise as dev,
           sum(case when e.type = 'MINERVAL' then round(e.montant * (100 - i.remise_pct) / 100, 2) else e.montant end) as annee,
           coalesce(sum(case when e.type = 'MINERVAL' then round(e.montant * (100 - i.remise_pct) / 100, 2) else e.montant end)
             filter (where e.mois is null or e.mois <= date_trunc('month', p_date)::date), 0) as echu
      from public.inscriptions i
      join public.echeances e
        on e.classe_id = i.classe_id and e.annee_id = i.annee_id
       and (e.type <> 'MINERVAL' or e.mois >= i.premier_mois_du)
     group by i.id, e.devise
  ), paye as (
    select p.inscription_id as ins, p.devise as dev, sum(p.montant) as montant
      from public.paiements p
     where not p.annule and p.date_paiement <= p_date
     group by p.inscription_id, p.devise
  ), cles as (
    select ins, dev from du
    union
    select ins, dev from paye
  )
  select i.id, i.ecole_id, i.annee_id, i.classe_id, i.eleve_id, i.statut, k.dev,
         coalesce(du.annee, 0), coalesce(du.echu, 0), coalesce(pa.montant, 0),
         coalesce(du.annee, 0) - coalesce(pa.montant, 0),
         coalesce(du.echu, 0) - coalesce(pa.montant, 0)
    from cles k
    join public.inscriptions i on i.id = k.ins
    left join du on du.ins = k.ins and du.dev = k.dev
    left join paye pa on pa.ins = k.ins and pa.dev = k.dev
$$;

revoke all on function public.situation_au(date) from public;
grant execute on function public.situation_au(date) to authenticated;

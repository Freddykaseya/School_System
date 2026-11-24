import type { Requete } from './db/types.ts'
import type { Annee, Classe, Ecole } from './types.ts'

/*
 * Lectures. Elles reçoivent une requête déjà liée à l'utilisateur connecté
 * (voir lireEnTantQueConnecte dans lib/session.ts) : la base applique ses
 * règles d'accès. Les totaux sont calculés par la base, sur toutes les
 * lignes — jamais sur une liste tronquée.
 */

export type { Annee }
export type Totaux = { effectif: number; du: number; paye: number; reste: number }
export type ClasseAvecTotaux = Classe & Totaux
export type EcoleAvecTotaux = Ecole & Totaux & { nbClasses: number; nbComptes: number }

const COLONNES_ECOLE = `e.id, e.code, e.nom, e.cycles::text[] as cycles, e.devise_defaut::text as devise_defaut, e.actif`
const SOMMES = `count(s.inscription_id)::int as effectif,
  coalesce(sum(s.montant_du), 0)::float8 as du,
  coalesce(sum(s.montant_paye), 0)::float8 as paye,
  coalesce(sum(s.reste), 0)::float8 as reste`

export async function anneeActive(q: Requete): Promise<Annee | null> {
  const [annee] = await q<Annee>('select id::text, libelle from annees_scolaires where active')
  return annee ?? null
}

/** Classes d'une école avec effectif et situation financière de l'année active. */
export async function classesEtTotaux(
  q: Requete,
  ecoleId: string,
): Promise<{ annee: Annee | null; classes: ClasseAvecTotaux[]; total: Totaux }> {
  const annee = await anneeActive(q)
  const classes = await q<ClasseAvecTotaux>(
    `select c.id::text, c.ecole_id::text, c.cycle::text as cycle, c.niveau, c.option_code, c.libelle, c.ordre, c.actif,
            ${SOMMES}
       from classes c
       left join situation_inscriptions s on s.classe_id = c.id and s.annee_id = $2
      where c.ecole_id = $1 and c.actif
      group by c.id
      order by c.ordre, c.libelle`,
    [ecoleId, annee?.id ?? null],
  )
  // Total de l'école : toutes les inscriptions, même dans une classe fermée depuis.
  const [total] = await q<Totaux>(
    `select ${SOMMES} from situation_inscriptions s where s.ecole_id = $1 and s.annee_id = $2`,
    [ecoleId, annee?.id ?? null],
  )
  return { annee, classes, total }
}

/** Vue d'ensemble de toutes les écoles (administrateur). */
export async function ecolesEtTotaux(q: Requete): Promise<{ annee: Annee | null; ecoles: EcoleAvecTotaux[] }> {
  const annee = await anneeActive(q)
  const ecoles = await q<EcoleAvecTotaux>(
    `select ${COLONNES_ECOLE},
            (select count(*)::int from classes c where c.ecole_id = e.id and c.actif) as "nbClasses",
            (select count(*)::int from profils p where p.ecole_id = e.id and p.actif) as "nbComptes",
            coalesce(t.effectif, 0) as effectif, coalesce(t.du, 0) as du,
            coalesce(t.paye, 0) as paye, coalesce(t.reste, 0) as reste
       from ecoles e
       left join (
         select s.ecole_id, ${SOMMES}
           from situation_inscriptions s
          where s.annee_id = $1
          group by s.ecole_id
       ) t on t.ecole_id = e.id
      order by e.code`,
    [annee?.id ?? null],
  )
  return { annee, ecoles }
}

export async function ecoleParCode(q: Requete, code: string): Promise<Ecole | null> {
  const [ecole] = await q<Ecole>(`select ${COLONNES_ECOLE} from ecoles e where e.code = $1`, [code])
  return ecole ?? null
}

export async function ecoleParId(q: Requete, id: string): Promise<Ecole | null> {
  const [ecole] = await q<Ecole>(`select ${COLONNES_ECOLE} from ecoles e where e.id = $1`, [id])
  return ecole ?? null
}

import { enTantQue } from '../db/en-tant-que.ts'
import type { Connexion, Requete } from '../db/types.ts'
import type { Devise } from '../types.ts'

/*
 * Grille de frais d'une école, classe par classe, pour une année scolaire.
 * Fixée par l'administrateur (la base le vérifie : seules ses écritures
 * sur « echeances » sont acceptées). Chaque frais devient une ou plusieurs
 * échéances : le minerval mensuel donne une échéance par mois facturé.
 */

export const DEVISES: Devise[] = ['CDF', 'USD']

/** Un frais ponctuel : tranche, bulletin, autre. `mois` = 1er du mois d'échéance (AAAA-MM-01). */
export type LigneFrais = { libelle: string; montant: number; devise: Devise; mois: string }

export type FraisClasse = {
  minerval: { montant: number; devise: Devise; mois: string[] } | null
  tranches: LigneFrais[]
  bulletin: LigneFrais | null
  autres: LigneFrais[]
}

export const FRAIS_VIDES: FraisClasse = { minerval: null, tranches: [], bulletin: null, autres: [] }

/** Erreur à montrer telle quelle à l'administrateur. */
export class ErreurFrais extends Error {}

const NOMS_MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

export type MoisScolaire = { cle: string; nom: string; court: string }

/** Mois d'une année scolaire, du mois de début au mois de fin (AAAA-MM-01). */
export function moisDeLAnnee(debut: string, fin: string): MoisScolaire[] {
  const mois: MoisScolaire[] = []
  let [a, m] = debut.slice(0, 7).split('-').map(Number)
  const [af, mf] = fin.slice(0, 7).split('-').map(Number)
  while (a < af || (a === af && m <= mf)) {
    const nom = NOMS_MOIS[m - 1]
    mois.push({ cle: `${a}-${String(m).padStart(2, '0')}-01`, nom, court: nom.length > 5 ? `${nom.slice(0, 4)}.` : nom })
    m += 1
    if (m > 12) { m = 1; a += 1 }
  }
  return mois
}

const nomMois = (cle: string) => NOMS_MOIS[Number(cle.slice(5, 7)) - 1]

type Echeance = { type: string; libelle: string; mois: string | null; montant: number; devise: Devise; ordre: number }

/** Reconstitue les frais d'une classe à partir de ses échéances. */
export function fraisDepuisEcheances(echeances: Echeance[]): FraisClasse {
  const tri = [...echeances].sort((a, b) => a.ordre - b.ordre || (a.mois ?? '').localeCompare(b.mois ?? ''))
  const minervals = tri.filter((e) => e.type === 'MINERVAL')
  const ligne = (e: Echeance): LigneFrais => ({ libelle: e.libelle, montant: Number(e.montant), devise: e.devise, mois: e.mois ?? '' })
  // Montant du minerval : le plus fréquent (normalement identique tous les mois).
  const freq = new Map<string, number>()
  for (const e of minervals) freq.set(`${Number(e.montant)}|${e.devise}`, (freq.get(`${Number(e.montant)}|${e.devise}`) ?? 0) + 1)
  const [montant, devise] = ([...freq].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '').split('|')
  return {
    minerval: minervals.length ? { montant: Number(montant), devise: devise as Devise, mois: minervals.map((e) => e.mois!).sort() } : null,
    tranches: tri.filter((e) => e.type === 'TRANCHE').map(ligne),
    bulletin: tri.filter((e) => e.type === 'BULLETIN').map(ligne)[0] ?? null,
    autres: tri.filter((e) => e.type === 'AUTRE' || e.type === 'INSCRIPTION').map(ligne),
  }
}

/** Total prévu sur l'année, par monnaie (sans remise). */
export function totalAnnuel(f: FraisClasse): Partial<Record<Devise, number>> {
  const total: Partial<Record<Devise, number>> = {}
  const ajouter = (d: Devise, m: number) => { total[d] = Math.round(((total[d] ?? 0) + m) * 100) / 100 }
  if (f.minerval) ajouter(f.minerval.devise, f.minerval.montant * f.minerval.mois.length)
  for (const l of [...f.tranches, ...(f.bulletin ? [f.bulletin] : []), ...f.autres]) ajouter(l.devise, l.montant)
  return total
}

function verifierMontant(montant: number, devise: Devise, quoi: string) {
  if (!Number.isFinite(montant) || montant < 0) throw new ErreurFrais(`${quoi} : montant invalide.`)
  if (!DEVISES.includes(devise)) throw new ErreurFrais(`${quoi} : monnaie inconnue.`)
  if (devise === 'CDF' && !Number.isInteger(montant)) throw new ErreurFrais(`${quoi} : un montant en francs congolais n’a pas de centimes.`)
  if (devise === 'USD' && Math.round(montant * 100) !== montant * 100) throw new ErreurFrais(`${quoi} : deux chiffres après la virgule au plus.`)
}

/** Échéances à enregistrer pour une classe, après vérification. */
export function echeancesVoulues(f: FraisClasse, moisValides: Set<string>): Echeance[] {
  const voulues: Echeance[] = []
  if (f.minerval) {
    verifierMontant(f.minerval.montant, f.minerval.devise, 'Minerval')
    if (f.minerval.mois.length === 0) throw new ErreurFrais('Minerval : cochez au moins un mois.')
    for (const m of f.minerval.mois) {
      if (!moisValides.has(m)) throw new ErreurFrais('Minerval : un mois est hors de l’année scolaire.')
      voulues.push({ type: 'MINERVAL', libelle: `Minerval ${nomMois(m)}`, mois: m, montant: f.minerval.montant, devise: f.minerval.devise, ordre: [...moisValides].indexOf(m) + 1 })
    }
  }
  const lignes: [string, LigneFrais, number][] = [
    ...f.tranches.map((l, i) => ['TRANCHE', l, 20 + i] as [string, LigneFrais, number]),
    ...(f.bulletin ? [['BULLETIN', f.bulletin, 30] as [string, LigneFrais, number]] : []),
    ...f.autres.map((l, i) => ['AUTRE', l, 40 + i] as [string, LigneFrais, number]),
  ]
  for (const [type, l, ordre] of lignes) {
    const libelle = l.libelle.trim().replace(/\s+/g, ' ')
    if (!libelle) throw new ErreurFrais('Chaque frais doit avoir un nom.')
    verifierMontant(l.montant, l.devise, libelle)
    if (!moisValides.has(l.mois)) throw new ErreurFrais(`${libelle} : choisissez le mois d’échéance.`)
    voulues.push({ type, libelle, mois: l.mois, montant: l.montant, devise: l.devise, ordre })
  }
  const cles = voulues.map((e) => `${e.type}|${e.libelle.toLowerCase()}`)
  const doublon = cles.find((c, i) => cles.indexOf(c) !== i)
  if (doublon) throw new ErreurFrais(`Deux frais portent le même nom : « ${doublon.split('|')[1]} ».`)
  return voulues
}

export type Annee = { id: string; libelle: string; debut: string; fin: string }

export async function anneeActive(q: Requete): Promise<Annee | null> {
  const [a] = await q<Annee>(`select id::text, libelle, debut::text, fin::text from annees_scolaires where active`)
  return a ?? null
}

/** Grille de toutes les classes d'une école pour une année. */
export async function lireGrille(q: Requete, ecoleId: string, anneeId: string): Promise<Map<string, FraisClasse>> {
  const lignes = await q<Echeance & { classe_id: string }>(
    `select classe_id::text, type::text as type, libelle, mois::text, montant::float8 as montant, devise::text as devise, ordre
       from echeances where ecole_id = $1 and annee_id = $2`,
    [ecoleId, anneeId],
  )
  const parClasse = new Map<string, Echeance[]>()
  for (const l of lignes) parClasse.set(l.classe_id, [...(parClasse.get(l.classe_id) ?? []), l])
  return new Map([...parClasse].map(([id, e]) => [id, fraisDepuisEcheances(e)]))
}

/**
 * Enregistre les mêmes frais pour une ou plusieurs classes d'une école.
 * Remplace la grille de chaque classe ; refuse de supprimer un frais déjà
 * utilisé par un paiement (il faudrait d'abord annuler ces paiements).
 */
export async function enregistrerFrais(
  connexion: Connexion,
  adminId: string,
  { ecoleId, anneeId, classeIds, frais }: { ecoleId: string; anneeId: string; classeIds: string[]; frais: FraisClasse },
): Promise<number> {
  if (classeIds.length === 0) throw new ErreurFrais('Choisissez au moins une classe.')
  return enTantQue(connexion, adminId, async (q) => {
    const [annee] = await q<Annee>(`select id::text, libelle, debut::text, fin::text from annees_scolaires where id = $1`, [anneeId])
    if (!annee) throw new ErreurFrais('Année scolaire introuvable.')
    const voulues = echeancesVoulues(frais, new Set(moisDeLAnnee(annee.debut, annee.fin).map((m) => m.cle)))
    const classes = await q<{ id: string; libelle: string }>(
      `select id::text, libelle from classes where ecole_id = $1 and id = any($2::uuid[])`,
      [ecoleId, classeIds],
    )
    if (classes.length !== new Set(classeIds).size) throw new ErreurFrais('Une des classes n’appartient pas à cette école.')

    for (const c of classes) {
      const existantes = await q<{ id: string; type: string; libelle: string; utilisee: boolean }>(
        `select e.id::text, e.type::text as type, e.libelle,
                exists (select 1 from paiement_affectations a where a.echeance_id = e.id) as utilisee
           from echeances e where e.classe_id = $1 and e.annee_id = $2`,
        [c.id, anneeId],
      )
      const gardees = new Set(voulues.map((v) => `${v.type}|${v.libelle}`))
      const aSupprimer = existantes.filter((e) => !gardees.has(`${e.type}|${e.libelle}`))
      const bloquee = aSupprimer.find((e) => e.utilisee)
      if (bloquee) throw new ErreurFrais(`${c.libelle} : « ${bloquee.libelle} » a déjà reçu des paiements et ne peut pas être retiré.`)
      if (aSupprimer.length) await q('delete from echeances where id = any($1::uuid[])', [aSupprimer.map((e) => e.id)])
      for (const v of voulues) {
        await q(
          `insert into echeances (ecole_id, annee_id, classe_id, type, libelle, mois, ordre, montant, devise)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           on conflict (classe_id, annee_id, type, libelle)
           do update set mois = excluded.mois, ordre = excluded.ordre, montant = excluded.montant, devise = excluded.devise`,
          [ecoleId, anneeId, c.id, v.type, v.libelle, v.mois, v.ordre, v.montant, v.devise],
        )
      }
    }
    return classes.length
  })
}

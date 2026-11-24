import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Classe, Ecole } from '@/lib/types'

type Supabase = Awaited<ReturnType<typeof createClient>>

/** Lit toutes les lignes d'une requête, par pages de 1 000 (limite de l'API) :
 * un total ne doit jamais être calculé sur une liste tronquée. */
async function toutLire<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
    if (!data || data.length < 1000) return rows
  }
}

export type Annee = { id: string; libelle: string }

export async function anneeActive(supabase: Supabase): Promise<Annee | null> {
  const { data, error } = await supabase.from('annees_scolaires').select('id, libelle').eq('active', true).maybeSingle<Annee>()
  if (error) throw new Error(error.message)
  return data
}

export type Totaux = { effectif: number; du: number; paye: number; reste: number }
const vide = (): Totaux => ({ effectif: 0, du: 0, paye: 0, reste: 0 })

export type ClasseAvecTotaux = Classe & Totaux

/** Classes d'une école avec effectif et situation financière de l'année active. */
export async function classesEtTotaux(ecoleId: string): Promise<{ annee: Annee | null; classes: ClasseAvecTotaux[]; total: Totaux }> {
  const supabase = await createClient()
  const annee = await anneeActive(supabase)
  const classes = await toutLire<Classe>((a, b) =>
    supabase.from('classes').select('id, ecole_id, cycle, niveau, option_code, libelle, ordre, actif').eq('ecole_id', ecoleId).eq('actif', true).order('ordre').range(a, b),
  )
  const situations = annee
    ? await toutLire<{ classe_id: string; montant_du: number; montant_paye: number; reste: number }>((a, b) =>
        supabase.from('situation_inscriptions').select('classe_id, montant_du, montant_paye, reste').eq('ecole_id', ecoleId).eq('annee_id', annee.id).range(a, b),
      )
    : []

  const parClasse = new Map<string, Totaux>()
  const total = vide()
  for (const s of situations) {
    const t = parClasse.get(s.classe_id) ?? vide()
    for (const cible of [t, total]) {
      cible.effectif += 1
      cible.du += Number(s.montant_du)
      cible.paye += Number(s.montant_paye)
      cible.reste += Number(s.reste)
    }
    parClasse.set(s.classe_id, t)
  }
  return { annee, classes: classes.map((c) => ({ ...c, ...(parClasse.get(c.id) ?? vide()) })), total }
}

export type EcoleAvecTotaux = Ecole & Totaux & { nbClasses: number; nbComptes: number }

/** Vue d'ensemble de toutes les écoles (administrateur). */
export async function ecolesEtTotaux(): Promise<{ annee: Annee | null; ecoles: EcoleAvecTotaux[] }> {
  const supabase = await createClient()
  const annee = await anneeActive(supabase)
  const [ecoles, classes, comptes, situations] = await Promise.all([
    toutLire<Ecole>((a, b) => supabase.from('ecoles').select('id, code, nom, cycles, devise_defaut, actif').order('code').range(a, b)),
    toutLire<{ ecole_id: string }>((a, b) => supabase.from('classes').select('ecole_id').eq('actif', true).range(a, b)),
    toutLire<{ ecole_id: string | null }>((a, b) => supabase.from('profils').select('ecole_id').eq('actif', true).range(a, b)),
    annee
      ? toutLire<{ ecole_id: string; montant_du: number; montant_paye: number; reste: number }>((a, b) =>
          supabase.from('situation_inscriptions').select('ecole_id, montant_du, montant_paye, reste').eq('annee_id', annee.id).range(a, b),
        )
      : Promise.resolve([]),
  ])
  const compter = (rows: { ecole_id: string | null }[], id: string) => rows.filter((r) => r.ecole_id === id).length
  return {
    annee,
    ecoles: ecoles.map((e) => {
      const t = vide()
      for (const s of situations) {
        if (s.ecole_id !== e.id) continue
        t.effectif += 1
        t.du += Number(s.montant_du)
        t.paye += Number(s.montant_paye)
        t.reste += Number(s.reste)
      }
      return { ...e, ...t, nbClasses: compter(classes, e.id), nbComptes: compter(comptes, e.id) }
    }),
  }
}

export async function ecoleParCode(code: string): Promise<Ecole | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('ecoles').select('id, code, nom, cycles, devise_defaut, actif').eq('code', code).maybeSingle<Ecole>()
  if (error) throw new Error(error.message)
  return data
}

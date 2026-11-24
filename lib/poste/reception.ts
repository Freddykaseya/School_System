import type { PGlite } from '@electric-sql/pglite'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { ExecuteurSql } from '../db/types.ts'
import { definirParametre, parametre } from './comptes.ts'

type Ligne = Record<string, unknown>

/** Ce que le centre envoie au PC : le compte et la configuration de son école. */
export type LotReception = {
  profil: Ligne
  ecole: Ligne
  annees: Ligne[]
  options: Ligne[]
  classes: Ligne[]
  echeances: Ligne[]
}

/** Erreur à montrer telle quelle à l'utilisateur. */
export class ErreurPoste extends Error {}

const TABLES = {
  ecoles: { cle: 'id', colonnes: ['id', 'code', 'nom', 'cycles', 'devise_defaut', 'actif', 'created_at'] },
  annees_scolaires: { cle: 'id', colonnes: ['id', 'libelle', 'debut', 'fin', 'active', 'created_at'] },
  options_humanites: { cle: 'code', colonnes: ['code', 'libelle'] },
  classes: { cle: 'id', colonnes: ['id', 'ecole_id', 'cycle', 'niveau', 'option_code', 'libelle', 'ordre', 'actif', 'created_at'] },
  echeances: {
    cle: 'id',
    colonnes: ['id', 'ecole_id', 'annee_id', 'classe_id', 'type', 'libelle', 'mois', 'ordre', 'montant', 'devise', 'created_at'],
  },
  profils: { cle: 'id', colonnes: ['id', 'email', 'nom_complet', 'role', 'ecole_id', 'actif', 'created_at'] },
} as const

/** Insère ou met à jour des lignes reçues, telles quelles. */
async function recopier(tx: ExecuteurSql, table: keyof typeof TABLES, lignes: Ligne[]) {
  if (lignes.length === 0) return
  const { cle, colonnes } = TABLES[table]
  const liste = colonnes.join(', ')
  const maj = colonnes.filter((c) => c !== cle).map((c) => `${c} = excluded.${c}`).join(', ')
  await tx.query(
    `insert into public.${table} (${liste})
     select ${liste} from jsonb_populate_recordset(null::public.${table}, $1::jsonb)
     on conflict (${cle}) do update set ${maj}`,
    [JSON.stringify(lignes)],
  )
}

/**
 * Enregistre sur le PC ce que le centre a envoyé. Un PC appartient à UNE
 * école : la première connexion le rattache, et un compte d'une autre école
 * y est ensuite refusé.
 */
export async function appliquerReception(db: PGlite, lot: LotReception): Promise<void> {
  const ecoleId = lot.profil.ecole_id
  if (typeof ecoleId !== 'string') {
    throw new ErreurPoste('Le compte administrateur s’utilise en ligne, pas sur le PC d’une école.')
  }
  if (lot.ecole.id !== ecoleId) throw new Error('Lot de réception incohérent : école différente de celle du compte.')

  const rattachee = await parametre(db, 'ecole_id')
  if (rattachee && rattachee !== ecoleId) {
    const { rows } = await db.query<{ code: string }>('select code from public.ecoles where id = $1', [rattachee])
    throw new ErreurPoste(`Ce PC appartient à l’école ${rows[0]?.code ?? 'déjà rattachée'} : ce compte n’y a pas accès.`)
  }
  for (const liste of [lot.classes, lot.echeances]) {
    if (liste.some((l) => l.ecole_id !== ecoleId)) throw new Error('Lot de réception incohérent : données d’une autre école.')
  }

  await db.transaction(async (tx) => {
    // Ces données viennent du centre : rien à lui renvoyer.
    await tx.query(`select set_config('erp.reception', 'on', true)`)
    await recopier(tx, 'ecoles', [lot.ecole])
    // Une seule année active : on éteint l'ancienne avant de recopier.
    await tx.query('update public.annees_scolaires set active = false where active')
    await recopier(tx, 'annees_scolaires', lot.annees)
    await recopier(tx, 'options_humanites', lot.options)
    await recopier(tx, 'classes', lot.classes)
    await recopier(tx, 'echeances', lot.echeances)
    await tx.query(
      'insert into auth.users (id, email) values ($1, $2) on conflict (id) do update set email = excluded.email',
      [lot.profil.id, lot.profil.email],
    )
    await recopier(tx, 'profils', [lot.profil])
    if (!rattachee) await definirParametre(tx, 'ecole_id', ecoleId)
    await definirParametre(tx, 'derniere_reception', new Date().toISOString())
  })
}

/** Lit toutes les lignes, par pages de 1 000, dans un ordre stable. */
async function toutLire(
  page: (de: number, a: number) => PromiseLike<{ data: Ligne[] | null; error: { message: string } | null }>,
): Promise<Ligne[]> {
  const lignes: Ligne[] = []
  for (let de = 0; ; de += 1000) {
    const { data, error } = await page(de, de + 999)
    if (error) throw new Error(error.message)
    lignes.push(...(data ?? []))
    if (!data || data.length < 1000) return lignes
  }
}

/** Télécharge, avec la session de l'utilisateur, ce que le PC doit connaître. */
export async function telechargerReception(supabase: SupabaseClient, userId: string): Promise<LotReception> {
  const { data: profil, error } = await supabase.from('profils').select('*').eq('id', userId).maybeSingle<Ligne>()
  if (error) throw new Error(error.message)
  if (!profil) throw new ErreurPoste('Ce compte n’a pas de profil. Contactez l’administrateur.')
  if (typeof profil.ecole_id !== 'string') {
    throw new ErreurPoste('Le compte administrateur s’utilise en ligne, pas sur le PC d’une école.')
  }
  const ecoleId = profil.ecole_id

  const { data: ecole, error: e2 } = await supabase.from('ecoles').select('*').eq('id', ecoleId).single<Ligne>()
  if (e2) throw new Error(e2.message)
  const [annees, options, classes, echeances] = await Promise.all([
    toutLire((a, b) => supabase.from('annees_scolaires').select('*').order('id').range(a, b)),
    toutLire((a, b) => supabase.from('options_humanites').select('*').order('code').range(a, b)),
    toutLire((a, b) => supabase.from('classes').select('*').eq('ecole_id', ecoleId).order('id').range(a, b)),
    toutLire((a, b) => supabase.from('echeances').select('*').eq('ecole_id', ecoleId).order('id').range(a, b)),
  ])
  return { profil, ecole, annees, options, classes, echeances }
}

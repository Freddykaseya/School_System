import 'server-only'

import type { PGlite } from '@electric-sql/pglite'

import { MODE } from '@/lib/mode'

import { connexionCentre } from './centre'
import { connexionPGlite, dossierDonnees, ouvrirBaseLocale } from './local'
import type { Connexion } from './types'

// Gardés sur globalThis : le rechargement à chaud du mode développement ne
// doit pas rouvrir la base (une seule ouverture par programme).
const g = globalThis as typeof globalThis & { __erpBaseLocale?: Promise<PGlite>; __erpConnexion?: Promise<Connexion> }

/** Base du PC de l'école, ouverte une fois et mise à jour au démarrage. */
export function baseLocale(): Promise<PGlite> {
  if (MODE !== 'ecole') throw new Error('Pas de base locale en mode centre.')
  g.__erpBaseLocale ??= ouvrirBaseLocale(dossierDonnees()).catch((e) => {
    g.__erpBaseLocale = undefined
    throw e
  })
  return g.__erpBaseLocale
}

/** Base de travail : celle du PC (mode école) ou la base centrale. */
export function connexion(): Promise<Connexion> {
  g.__erpConnexion ??= (async () => {
    if (MODE === 'ecole') return connexionPGlite(await baseLocale())
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL manquant (.env.local) : adresse PostgreSQL de la base centrale.')
    return connexionCentre(url)
  })().catch((e) => {
    g.__erpConnexion = undefined
    throw e
  })
  return g.__erpConnexion
}

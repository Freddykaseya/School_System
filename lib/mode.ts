/**
 * Deux façons de faire tourner l'application :
 *   - « ecole » (par défaut) : sur le PC d'une école, base PGlite locale,
 *     fonctionne sans internet ;
 *   - « centre » : en ligne, base centrale Supabase, pour l'administrateur.
 *
 * Centre sans DATABASE_URL = centre de DÉMONSTRATION : base PGlite locale
 * et comptes gérés par l'application, pour essayer l'administration avant
 * que la base Supabase existe.
 */
export type Mode = 'ecole' | 'centre'

export const MODE: Mode = process.env.ERP_MODE === 'centre' ? 'centre' : 'ecole'

export const CENTRE_DEMO = MODE === 'centre' && !process.env.DATABASE_URL

/** Comptes et sessions gérés par l'application (et non par Supabase Auth). */
export const AUTH_LOCALE = MODE === 'ecole' || CENTRE_DEMO

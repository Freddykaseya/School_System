/**
 * Deux façons de faire tourner l'application :
 *   - « ecole » (par défaut) : sur le PC d'une école, base PGlite locale,
 *     fonctionne sans internet ;
 *   - « centre » : en ligne, base centrale Supabase, pour l'administrateur.
 */
export type Mode = 'ecole' | 'centre'

export const MODE: Mode = process.env.ERP_MODE === 'centre' ? 'centre' : 'ecole'

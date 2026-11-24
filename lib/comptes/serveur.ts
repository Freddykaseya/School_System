import 'server-only'

import { baseLocale } from '@/lib/db/serveur'
import { CENTRE_DEMO, MODE } from '@/lib/mode'
import { supabaseConfig } from '@/lib/supabase/config'

import { identitesLocales, identitesSupabase, type Identites } from './identites'

/** Identités du centre : Supabase Auth, ou base locale en démonstration. */
export async function identites(): Promise<Identites> {
  if (MODE === 'ecole') throw new Error('Les comptes se gèrent au centre, pas sur le PC d’une école.')
  if (CENTRE_DEMO) return identitesLocales(await baseLocale())
  const config = supabaseConfig()
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!config || !cle) throw new Error('SUPABASE_SERVICE_ROLE_KEY manquant (.env.local du serveur central).')
  return identitesSupabase(config.url, cle)
}

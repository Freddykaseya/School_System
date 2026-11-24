import 'server-only'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { supabaseConfig } from './config'

/**
 * Client Supabase lié à la session de l'utilisateur connecté. Toutes les
 * lectures passent par lui : la base applique alors les règles d'accès
 * (un compte d'école ne voit que son école).
 */
export async function createClient() {
  const config = supabaseConfig()
  if (!config) throw new Error('Configuration Supabase manquante (.env.local).')
  const cookieStore = await cookies()

  return createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options)
        } catch {
          // Appelé depuis un Server Component : le proxy rafraîchit la session.
        }
      },
    },
  })
}

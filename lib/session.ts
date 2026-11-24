import 'server-only'

import { redirect } from 'next/navigation'
import { cache } from 'react'

import { createClient } from '@/lib/supabase/server'
import type { Ecole, Profil } from '@/lib/types'

export type Session = { profil: Profil; ecole: Ecole | null }

/**
 * Compte connecté et son école. Redirige vers /login si la session ou le
 * profil manque, ou si le compte est désactivé. Mis en cache pour la durée
 * d'une requête.
 */
export const getSession = cache(async (): Promise<Session> => {
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims?.sub
  if (!userId) redirect('/login')

  const { data: profil, error } = await supabase
    .from('profils')
    .select('id, email, nom_complet, role, ecole_id, actif')
    .eq('id', userId)
    .maybeSingle<Profil>()

  if (error) throw new Error(`Lecture du profil impossible : ${error.message}`)
  if (!profil || !profil.actif) redirect('/login?erreur=compte')

  let ecole: Ecole | null = null
  if (profil.ecole_id) {
    const { data } = await supabase
      .from('ecoles')
      .select('id, code, nom, cycles, devise_defaut, actif')
      .eq('id', profil.ecole_id)
      .maybeSingle<Ecole>()
    ecole = data ?? null
  }
  return { profil, ecole }
})

/** Réservé à l'administrateur du groupe scolaire. */
export async function requireAdmin(): Promise<Session> {
  const session = await getSession()
  if (session.profil.role !== 'ADMIN') redirect('/')
  return session
}

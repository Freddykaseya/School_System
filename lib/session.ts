import 'server-only'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'

import { COOKIE_SESSION } from '@/lib/auth/constantes'
import { verifierJeton } from '@/lib/auth/jeton'
import { enTantQue } from '@/lib/db/en-tant-que'
import { baseLocale, connexion } from '@/lib/db/serveur'
import type { Requete } from '@/lib/db/types'
import { ecoleParId } from '@/lib/donnees'
import { AUTH_LOCALE } from '@/lib/mode'
import { secretSession } from '@/lib/poste/comptes'
import { createClient } from '@/lib/supabase/server'
import type { Ecole, Profil } from '@/lib/types'

export type Session = { profil: Profil; ecole: Ecole | null }

/** Identifiant de l'utilisateur connecté, ou null. */
async function utilisateurConnecte(): Promise<string | null> {
  if (AUTH_LOCALE) {
    const jeton = (await cookies()).get(COOKIE_SESSION)?.value
    return verifierJeton(jeton, await secretSession(await baseLocale()))
  }
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const sub = data?.claims?.sub
  return typeof sub === 'string' ? sub : null
}

/**
 * Compte connecté et son école. Redirige vers /login si la session ou le
 * profil manque, ou si le compte est désactivé. Mis en cache pour la durée
 * d'une requête.
 */
export const getSession = cache(async (): Promise<Session> => {
  const userId = await utilisateurConnecte()
  if (!userId) redirect('/login')

  const session = await enTantQue(await connexion(), userId, async (q) => {
    const [profil] = await q<Profil>(
      `select id::text, email, nom_complet, role::text as role, ecole_id::text, actif from profils where id = $1`,
      [userId],
    )
    if (!profil) return null
    return { profil, ecole: profil.ecole_id ? await ecoleParId(q, profil.ecole_id) : null }
  })

  if (!session || !session.profil.actif) redirect('/login?erreur=compte')
  return session
})

/** Réservé à l'administrateur du groupe scolaire. */
export async function requireAdmin(): Promise<Session> {
  const session = await getSession()
  if (session.profil.role !== 'ADMIN') redirect('/')
  return session
}

/** Lit la base avec les droits du compte connecté. */
export async function lireEnTantQueConnecte<T>(fn: (q: Requete) => Promise<T>): Promise<T> {
  const { profil } = await getSession()
  return enTantQue(await connexion(), profil.id, fn)
}

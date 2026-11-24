'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { COOKIE_SESSION, DUREE_SESSION_SECONDES } from '@/lib/auth/constantes'
import { connexionEcole } from '@/lib/auth/connexion-ecole'
import { signerJeton } from '@/lib/auth/jeton'
import { baseLocale } from '@/lib/db/serveur'
import { MODE } from '@/lib/mode'
import { secretSession } from '@/lib/poste/comptes'
import { supabaseConfig } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'

export type EtatConnexion = { erreur: string | null }

export async function seConnecter(_: EtatConnexion, formData: FormData): Promise<EtatConnexion> {
  const email = String(formData.get('email') ?? '').trim()
  const motDePasse = String(formData.get('mot_de_passe') ?? '')
  if (!email || !motDePasse) return { erreur: 'Saisissez votre adresse e-mail et votre mot de passe.' }

  if (MODE === 'ecole') {
    const resultat = await connexionEcole(email, motDePasse)
    if ('erreur' in resultat) return { erreur: resultat.erreur }
    const jeton = signerJeton(resultat.userId, await secretSession(await baseLocale()), DUREE_SESSION_SECONDES)
    ;(await cookies()).set(COOKIE_SESSION, jeton, {
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
      maxAge: DUREE_SESSION_SECONDES,
    })
    redirect('/')
  }

  if (!supabaseConfig()) return { erreur: 'La base de données n’est pas encore configurée (.env.local).' }
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse })
  if (error) return { erreur: 'Adresse e-mail ou mot de passe incorrect.' }
  redirect('/')
}

export async function seDeconnecter() {
  if (MODE === 'ecole') {
    ;(await cookies()).delete(COOKIE_SESSION)
  } else {
    const supabase = await createClient()
    await supabase.auth.signOut()
  }
  redirect('/login')
}

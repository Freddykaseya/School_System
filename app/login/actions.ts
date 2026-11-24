'use server'

import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { supabaseConfig } from '@/lib/supabase/config'

export type EtatConnexion = { erreur: string | null }

export async function seConnecter(_: EtatConnexion, formData: FormData): Promise<EtatConnexion> {
  if (!supabaseConfig()) return { erreur: 'La base de données n’est pas encore configurée (.env.local).' }

  const email = String(formData.get('email') ?? '').trim()
  const motDePasse = String(formData.get('mot_de_passe') ?? '')
  if (!email || !motDePasse) return { erreur: 'Saisissez votre adresse e-mail et votre mot de passe.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse })
  if (error) return { erreur: 'Adresse e-mail ou mot de passe incorrect.' }

  redirect('/')
}

export async function seDeconnecter() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

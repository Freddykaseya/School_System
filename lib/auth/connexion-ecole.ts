import 'server-only'

import { createClient } from '@supabase/supabase-js'

import { baseLocale } from '@/lib/db/serveur'
import { enregistrerIdentifiant, verifierIdentifiant } from '@/lib/poste/comptes'
import { appliquerReception, ErreurPoste, telechargerReception } from '@/lib/poste/reception'
import { supabaseConfig } from '@/lib/supabase/config'

export type ResultatConnexion = { userId: string } | { erreur: string }

const HORS_LIGNE =
  'Pas de connexion internet. Ce compte ne s’est encore jamais connecté sur ce PC : la première connexion doit se faire avec internet.'

/**
 * Connexion sur le PC de l'école.
 *   1. Compte déjà connu du PC : vérifié sur place, sans internet.
 *   2. Sinon (ou mot de passe changé au centre) : vérifié en ligne auprès du
 *      centre, qui envoie le compte et la configuration de l'école ; le PC
 *      garde alors l'empreinte du mot de passe pour les fois suivantes.
 */
export async function connexionEcole(email: string, motDePasse: string): Promise<ResultatConnexion> {
  const db = await baseLocale()
  const local = await verifierIdentifiant(db, email, motDePasse)
  if (local) return { userId: local }

  const config = supabaseConfig()
  if (!config) return { erreur: 'Adresse e-mail ou mot de passe incorrect.' }

  const supabase = createClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false } })
  let userId: string
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: motDePasse })
    if (error) {
      // Erreur réseau (pas d'internet) ou refus du centre.
      const reseau = error.name === 'AuthRetryableFetchError' || !error.status
      return { erreur: reseau ? HORS_LIGNE : 'Adresse e-mail ou mot de passe incorrect.' }
    }
    userId = data.user.id
  } catch {
    return { erreur: HORS_LIGNE }
  }

  try {
    const lot = await telechargerReception(supabase, userId)
    if (lot.profil.actif !== true) return { erreur: 'Ce compte a été désactivé. Contactez l’administrateur.' }
    await appliquerReception(db, lot)
  } catch (e) {
    if (e instanceof ErreurPoste) return { erreur: e.message }
    console.error('connexion: réception impossible', e)
    return { erreur: 'La connexion au centre a été interrompue. Réessayez.' }
  } finally {
    await supabase.auth.signOut().catch(() => {})
  }

  await enregistrerIdentifiant(db, userId, email, motDePasse)
  return { userId }
}

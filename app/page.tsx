import { redirect } from 'next/navigation'

import { getSession } from '@/lib/session'

/** Après la connexion, chacun choisit son école (ou l'administration). */
export default async function Accueil() {
  await getSession()
  redirect('/choisir')
}

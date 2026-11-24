import { redirect } from 'next/navigation'

import { getSession } from '@/lib/session'

/** Aiguillage après connexion : l'administrateur choisit une école (ou
 * l'administration), tout autre compte arrive directement dans son école. */
export default async function Accueil() {
  const { profil } = await getSession()
  redirect(profil.role === 'ADMIN' ? '/choisir' : '/ecole')
}

import { redirect } from 'next/navigation'

import { getSession } from '@/lib/session'

/** Aiguillage après connexion : l'administrateur voit toutes les écoles,
 * tout autre compte arrive directement dans son école. */
export default async function Accueil() {
  const { profil } = await getSession()
  redirect(profil.role === 'ADMIN' ? '/admin' : '/ecole')
}

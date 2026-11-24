import { redirect } from 'next/navigation'

import { getSession } from '@/lib/session'

/** Ancienne adresse : l'espace de son école est désormais /ecoles/<code>. */
export default async function AncienneAdresseEcole() {
  const { ecole } = await getSession()
  redirect(ecole ? `/ecoles/${ecole.code}` : '/choisir')
}

import { redirect } from 'next/navigation'

/** Ancienne adresse : l'espace d'une école est désormais /ecoles/<code>. */
export default async function AncienneAdresseAdminEcole({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  redirect(`/ecoles/${code}`)
}

import { notFound } from 'next/navigation'

import { EspaceComptes } from '@/components/admin/espace-comptes'
import type { EcoleChoix } from '@/components/admin/formulaires-compte'
import { listerComptes } from '@/lib/comptes/service'
import { lireEnTantQueConnecte, requireAdmin } from '@/lib/session'

export default async function ComptesEcole({ params }: { params: Promise<{ code: string }> }) {
  await requireAdmin()
  const { code } = await params
  const { ecole, comptes } = await lireEnTantQueConnecte(async (q) => {
    const [ecole] = await q<EcoleChoix>('select id::text, code, nom from ecoles where code = $1 and actif', [code.toUpperCase()])
    const comptes = ecole ? (await listerComptes(q)).filter((c) => c.ecole_id === ecole.id && c.role !== 'ADMIN') : []
    return { ecole, comptes }
  })
  if (!ecole) notFound()
  return <EspaceComptes ecole={ecole} comptes={comptes} />
}

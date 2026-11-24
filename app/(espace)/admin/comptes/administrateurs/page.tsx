import { EspaceComptes } from '@/components/admin/espace-comptes'
import { listerComptes } from '@/lib/comptes/service'
import { lireEnTantQueConnecte, requireAdmin } from '@/lib/session'

export default async function ComptesAdministrateurs() {
  await requireAdmin()
  const comptes = (await lireEnTantQueConnecte(listerComptes)).filter((c) => c.role === 'ADMIN')
  return <EspaceComptes ecole={null} comptes={comptes} />
}

import Link from 'next/link'

/** Onglets de l'espace d'une école, côté administrateur. */
export function OngletsEcole({ code, actif }: { code: string; actif: 'tableau' | 'personnel' }) {
  return (
    <nav className="tabs" aria-label={`Espace ${code}`}>
      <Link href={`/admin/ecoles/${code}`} className={actif === 'tableau' ? 'active' : undefined}>Tableau de bord</Link>
      <Link href={`/admin/comptes/ecole/${code}`} className={actif === 'personnel' ? 'active' : undefined}>Personnel</Link>
    </nav>
  )
}

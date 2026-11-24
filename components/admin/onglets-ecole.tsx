import Link from 'next/link'

export type OngletEcole = 'accueil' | 'tableau' | 'comptabilite' | 'personnel'

/** Navigation à l'intérieur d'une école. « Personnel » : administrateur seulement. */
export function OngletsEcole({ code, actif, admin = false }: { code: string; actif: OngletEcole; admin?: boolean }) {
  const onglets: { cle: OngletEcole; libelle: string; href: string }[] = [
    { cle: 'accueil', libelle: 'Accueil', href: `/ecoles/${code}` },
    { cle: 'tableau', libelle: 'Tableau de bord', href: `/ecoles/${code}/tableau-de-bord` },
    { cle: 'comptabilite', libelle: 'Comptabilité', href: `/ecoles/${code}/comptabilite` },
    ...(admin ? [{ cle: 'personnel' as const, libelle: 'Personnel', href: `/admin/comptes/ecole/${code}` }] : []),
  ]
  return (
    <nav className="tabs ecran-seulement" aria-label={`Espace ${code}`}>
      {onglets.map((o) => (
        <Link key={o.cle} href={o.href} className={actif === o.cle ? 'active' : undefined}>{o.libelle}</Link>
      ))}
    </nav>
  )
}

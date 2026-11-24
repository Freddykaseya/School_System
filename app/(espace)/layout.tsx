import { seDeconnecter } from '@/app/login/actions'
import { Logo } from '@/components/logo'
import { NavLinks, type LienNav } from '@/components/nav-links'
import { ROLES } from '@/lib/libelles'
import { MARQUE } from '@/lib/marque'
import { CENTRE_DEMO } from '@/lib/mode'
import { getSession } from '@/lib/session'

export default async function EspaceLayout({ children }: { children: React.ReactNode }) {
  const { profil, ecole } = await getSession()
  const admin = profil.role === 'ADMIN'

  const liens: LienNav[] = admin
    ? [
        { href: '/choisir', libelle: 'Choisir une école', prefixes: ['/ecoles'] },
        { href: '/admin', libelle: 'Toutes les écoles', prefixes: [] },
        { href: '/admin/comptes', libelle: 'Comptes et accès' },
      ]
    : [
        { href: '/choisir', libelle: 'Choisir une école' },
        ...(ecole ? [{ href: `/ecoles/${ecole.code}`, libelle: `Mon école · ${ecole.code}` }] : []),
      ]

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <Logo />
          <div>
            <strong>{MARQUE.nom}</strong>
            <span>{admin ? 'Administration du groupe' : `${ecole?.code ?? 'École'} · ${ecole?.nom ?? ''}`}</span>
          </div>
        </div>
        {CENTRE_DEMO && admin ? (
          <div className="demo">Centre de démonstration : base locale, pas encore la base centrale.</div>
        ) : null}
        <div className="nav-label">Menu</div>
        <NavLinks liens={liens} />
        <div className="spacer" />
        <div className="user">
          <div>
            <strong>{profil.nom_complet}</strong>
            <span>{ROLES[profil.role]}</span>
          </div>
          <form action={seDeconnecter}>
            <button className="link-button" type="submit">Se déconnecter</button>
          </form>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  )
}

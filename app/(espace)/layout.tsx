import { seDeconnecter } from '@/app/login/actions'
import { NavLinks, type LienNav } from '@/components/nav-links'
import { ROLES } from '@/lib/libelles'
import { getSession } from '@/lib/session'

export default async function EspaceLayout({ children }: { children: React.ReactNode }) {
  const { profil, ecole } = await getSession()
  const admin = profil.role === 'ADMIN'

  const liens: LienNav[] = admin
    ? [{ href: '/admin', libelle: 'Toutes les écoles' }]
    : [{ href: '/ecole', libelle: 'Tableau de bord' }]

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">{admin ? 'ERP' : (ecole?.code.slice(0, 4) ?? '—')}</div>
          <div>
            <strong>{admin ? 'Groupe scolaire' : (ecole?.code ?? 'École')}</strong>
            <span>{admin ? 'Administration' : (ecole?.nom ?? '')}</span>
          </div>
        </div>
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

import Link from 'next/link'

import { AideRoles, FormNouveauCompte, type EcoleChoix } from '@/components/admin/formulaires-compte'
import { listerComptes } from '@/lib/comptes/service'
import { ROLES } from '@/lib/libelles'
import { lireEnTantQueConnecte, requireAdmin } from '@/lib/session'

export default async function Comptes({ searchParams }: { searchParams: Promise<{ ecole?: string }> }) {
  await requireAdmin()
  const { ecole: filtre } = await searchParams
  const { comptes, ecoles } = await lireEnTantQueConnecte(async (q) => ({
    comptes: await listerComptes(q),
    ecoles: await q<EcoleChoix>('select id::text, code, nom from ecoles where actif order by code'),
  }))

  const onglets = [
    { cle: undefined, libelle: 'Tous', nombre: comptes.length },
    ...ecoles.map((e) => ({ cle: e.code, libelle: e.code, nombre: comptes.filter((c) => c.ecole_code === e.code).length })),
    { cle: 'ADMIN', libelle: 'Administrateurs', nombre: comptes.filter((c) => c.role === 'ADMIN').length },
  ]
  const visibles = comptes.filter((c) => !filtre || (filtre === 'ADMIN' ? c.role === 'ADMIN' : c.ecole_code === filtre))

  return (
    <>
      <header className="heading">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Comptes et accès</h1>
          <p className="sub">Chaque personne a un rôle et accède à une seule école ; l’administrateur voit toutes les écoles.</p>
        </div>
      </header>

      <section className="card">
        <div className="card-head">
          <h2>Ajouter une personne</h2>
          <p>Elle pourra se connecter sur le PC de son école</p>
        </div>
        <FormNouveauCompte ecoles={ecoles} />
        <AideRoles />
      </section>

      <nav className="tabs" aria-label="Filtrer par école">
        {onglets.map((o) => (
          <Link key={o.libelle} href={o.cle ? `/admin/comptes?ecole=${o.cle}` : '/admin/comptes'} className={filtre === o.cle ? 'active' : undefined}>
            {o.libelle} · {o.nombre}
          </Link>
        ))}
      </nav>

      <section className="card">
        <div className="card-head">
          <h2>Personnes</h2>
          <p>{visibles.filter((c) => c.actif).length} actives · {visibles.filter((c) => !c.actif).length} désactivées</p>
        </div>
        {visibles.length === 0 ? (
          <div className="empty">Aucun compte ici pour l’instant.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Adresse e-mail</th>
                  <th>Rôle</th>
                  <th>École</th>
                  <th>État</th>
                  <th>Créé le</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((c) => (
                  <tr key={c.id}>
                    <td><Link href={`/admin/comptes/${c.id}`}>{c.nom_complet}</Link></td>
                    <td>{c.email}</td>
                    <td><span className={`badge ${c.role === 'ADMIN' ? 'brand' : 'neutral'}`}>{ROLES[c.role]}</span></td>
                    <td>{c.ecole_code ?? 'Toutes'}</td>
                    <td>{c.actif ? <span className="badge ok">Actif</span> : <span className="badge bad">Désactivé</span>}</td>
                    <td>{c.cree_le}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}

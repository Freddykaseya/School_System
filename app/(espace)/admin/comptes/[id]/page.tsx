import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AideRoles, FormModifierCompte, FormReinitialiser, type EcoleChoix } from '@/components/admin/formulaires-compte'
import { compteParId } from '@/lib/comptes/service'
import { ROLES } from '@/lib/libelles'
import { lireEnTantQueConnecte, requireAdmin } from '@/lib/session'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function FicheCompte({ params }: { params: Promise<{ id: string }> }) {
  const { profil } = await requireAdmin()
  const { id } = await params
  if (!UUID.test(id)) notFound()
  const { compte, ecoles } = await lireEnTantQueConnecte(async (q) => ({
    compte: await compteParId(q, id),
    ecoles: await q<EcoleChoix>('select id::text, code, nom from ecoles where actif order by code'),
  }))
  if (!compte) notFound()

  return (
    <>
      <header className="heading">
        <div>
          <p className="eyebrow"><Link href="/admin/comptes">Comptes et accès</Link> · {ROLES[compte.role]}</p>
          <h1>{compte.nom_complet}</h1>
          <p className="sub">{compte.email} · créé le {compte.cree_le}</p>
        </div>
      </header>

      <section className="card">
        <div className="card-head">
          <h2>Rôle et accès</h2>
          <p>L’adresse e-mail ne se change pas : créez un nouveau compte si besoin</p>
        </div>
        <FormModifierCompte compte={compte} ecoles={ecoles} estMoi={compte.id === profil.id} />
        <AideRoles />
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Mot de passe</h2>
        </div>
        <FormReinitialiser id={compte.id} nom={compte.nom_complet} />
      </section>
    </>
  )
}

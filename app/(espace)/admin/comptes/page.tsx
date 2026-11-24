import { Plus, School, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

import type { EcoleChoix } from '@/components/admin/formulaires-compte'
import { listerComptes, type Compte } from '@/lib/comptes/service'
import { ROLES } from '@/lib/libelles'
import { lireEnTantQueConnecte, requireAdmin } from '@/lib/session'
import type { Role } from '@/lib/types'

function Puces({ comptes, roles }: { comptes: Compte[]; roles: Role[] }) {
  const actifs = comptes.filter((c) => c.actif)
  return (
    <div className="tuile-roles">
      {roles.map((r) => (
        <span key={r} className="puce">
          {ROLES[r]} <b>{actifs.filter((c) => c.role === r).length}</b>
        </span>
      ))}
    </div>
  )
}

function Pied({ comptes }: { comptes: Compte[] }) {
  const actifs = comptes.filter((c) => c.actif).length
  return (
    <div className="tuile-pied">
      <small>
        {actifs} personne{actifs > 1 ? 's' : ''} active{actifs > 1 ? 's' : ''}
      </small>
      <span className="tuile-ajouter"><Plus size={16} aria-hidden="true" /> Ajouter</span>
    </div>
  )
}

export default async function Comptes() {
  await requireAdmin()
  const { comptes, ecoles } = await lireEnTantQueConnecte(async (q) => ({
    comptes: await listerComptes(q),
    ecoles: await q<EcoleChoix>('select id::text, code, nom from ecoles where actif order by code'),
  }))
  const admins = comptes.filter((c) => c.role === 'ADMIN')

  return (
    <>
      <header className="heading">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Comptes et accès</h1>
          <p className="sub">Choisissez une école pour voir son personnel et ajouter une personne.</p>
        </div>
      </header>

      <section className="tuiles" aria-label="Écoles">
        {ecoles.map((e) => {
          const liste = comptes.filter((c) => c.ecole_id === e.id)
          return (
            <Link key={e.id} href={`/admin/comptes/ecole/${e.code}`} className="tuile">
              <div className="tuile-icone"><School size={26} aria-hidden="true" /></div>
              <div className="tuile-titre">
                <strong>{e.code}</strong>
                <span>{e.nom}</span>
              </div>
              <Puces comptes={liste} roles={['DIRECTION', 'COMPTABLE', 'CAISSIER']} />
              <Pied comptes={liste} />
            </Link>
          )
        })}

        <Link href="/admin/comptes/administrateurs" className="tuile admin">
          <div className="tuile-icone"><ShieldCheck size={26} aria-hidden="true" /></div>
          <div className="tuile-titre">
            <strong>Administrateur</strong>
            <span>Accès à toutes les écoles et à la gestion des comptes</span>
          </div>
          <Puces comptes={admins} roles={['ADMIN']} />
          <Pied comptes={admins} />
        </Link>
      </section>
    </>
  )
}

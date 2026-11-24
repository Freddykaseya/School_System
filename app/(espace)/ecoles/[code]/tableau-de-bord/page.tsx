import Link from 'next/link'

import { OngletsEcole } from '@/components/admin/onglets-ecole'
import { VueEcole } from '@/components/vue-ecole'
import { ecoleAccessible } from '@/lib/acces'
import { classesEtTotaux } from '@/lib/donnees'
import { lireEnTantQueConnecte } from '@/lib/session'

export default async function TableauDeBord({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const { profil, ecoleOuverte: ecole } = await ecoleAccessible(code)
  const { annee, classes, total } = await lireEnTantQueConnecte((q) => classesEtTotaux(q, ecole.id))
  return (
    <>
      <header className="heading">
        <div>
          <p className="eyebrow"><Link href="/choisir">Choisir une école</Link> · <Link href={`/ecoles/${ecole.code}`}>{ecole.code}</Link> · année {annee?.libelle ?? '—'}</p>
          <h1>{ecole.nom}</h1>
          <p className="sub">Effectifs et paiements par classe.</p>
        </div>
      </header>
      <OngletsEcole code={ecole.code} actif="tableau" admin={profil.role === 'ADMIN'} />
      <VueEcole ecole={ecole} annee={annee} classes={classes} total={total} />
    </>
  )
}

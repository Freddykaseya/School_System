import { redirect } from 'next/navigation'

import { VueEcole } from '@/components/vue-ecole'
import { classesEtTotaux } from '@/lib/donnees'
import { getSession } from '@/lib/session'

export default async function TableauDeBordEcole() {
  const { profil, ecole } = await getSession()
  if (profil.role === 'ADMIN') redirect('/admin')
  if (!ecole) redirect('/login?erreur=compte')

  const { annee, classes, total } = await classesEtTotaux(ecole.id)
  return (
    <>
      <header className="heading">
        <div>
          <p className="eyebrow">{ecole.code} · année {annee?.libelle ?? '—'}</p>
          <h1>{ecole.nom}</h1>
          <p className="sub">Effectifs et paiements par classe.</p>
        </div>
      </header>
      <VueEcole ecole={ecole} annee={annee} classes={classes} total={total} />
    </>
  )
}

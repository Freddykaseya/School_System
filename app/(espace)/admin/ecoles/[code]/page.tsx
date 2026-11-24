import Link from 'next/link'
import { notFound } from 'next/navigation'

import { OngletsEcole } from '@/components/admin/onglets-ecole'
import { VueEcole } from '@/components/vue-ecole'
import { classesEtTotaux, ecoleParCode } from '@/lib/donnees'
import { lireEnTantQueConnecte, requireAdmin } from '@/lib/session'

export default async function AdminDetailEcole({ params }: { params: Promise<{ code: string }> }) {
  await requireAdmin()
  const { code } = await params
  const ecole = await lireEnTantQueConnecte((q) => ecoleParCode(q, code.toUpperCase()))
  if (!ecole) notFound()

  const { annee, classes, total } = await lireEnTantQueConnecte((q) => classesEtTotaux(q, ecole.id))
  return (
    <>
      <header className="heading">
        <div>
          <p className="eyebrow"><Link href="/choisir">Choisir une école</Link> · {ecole.code}</p>
          <h1>{ecole.nom}</h1>
          <p className="sub">Vue identique à celle de l’école, en lecture.</p>
        </div>
      </header>
      <OngletsEcole code={ecole.code} actif="tableau" />
      <VueEcole ecole={ecole} annee={annee} classes={classes} total={total} />
    </>
  )
}

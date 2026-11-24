import Link from 'next/link'
import { notFound } from 'next/navigation'

import { VueEcole } from '@/components/vue-ecole'
import { classesEtTotaux, ecoleParCode } from '@/lib/donnees'
import { requireAdmin } from '@/lib/session'

export default async function AdminDetailEcole({ params }: { params: Promise<{ code: string }> }) {
  await requireAdmin()
  const { code } = await params
  const ecole = await ecoleParCode(code.toUpperCase())
  if (!ecole) notFound()

  const { annee, classes, total } = await classesEtTotaux(ecole.id)
  return (
    <>
      <header className="heading">
        <div>
          <p className="eyebrow"><Link href="/admin">Toutes les écoles</Link> · {ecole.code}</p>
          <h1>{ecole.nom}</h1>
          <p className="sub">Vue identique à celle de l’école, en lecture.</p>
        </div>
      </header>
      <VueEcole ecole={ecole} annee={annee} classes={classes} total={total} />
    </>
  )
}

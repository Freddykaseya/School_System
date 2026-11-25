import Link from 'next/link'

import { FormFrais, type ClasseFrais } from '@/components/frais/form-frais'
import { ecoleAccessible, refuser } from '@/lib/acces'
import { anneeActive, lireGrille, moisDeLAnnee } from '@/lib/frais/service'
import { CYCLES } from '@/lib/libelles'
import { lireEnTantQueConnecte } from '@/lib/session'
import type { Cycle } from '@/lib/types'

/** Fixer les frais d'une ou plusieurs classes (administrateur). */
export default async function ModifierFrais({ params, searchParams }: {
  params: Promise<{ code: string }>; searchParams: Promise<{ classe?: string }>
}) {
  const { code } = await params
  const { classe } = await searchParams
  const { profil, ecoleOuverte: ecole } = await ecoleAccessible(code)
  if (profil.role !== 'ADMIN') refuser('admin')

  const { annee, classes } = await lireEnTantQueConnecte(async (q) => {
    const annee = await anneeActive(q)
    const liste = await q<{ id: string; libelle: string; cycle: Cycle }>(
      `select id::text, libelle, cycle::text as cycle from classes where ecole_id = $1 and actif order by ordre, libelle`,
      [ecole.id],
    )
    const grille = annee ? await lireGrille(q, ecole.id, annee.id) : new Map()
    return { annee, classes: liste.map((c): ClasseFrais => ({ id: c.id, libelle: c.libelle, cycle: CYCLES[c.cycle], frais: grille.get(c.id) ?? null })) }
  })

  return (
    <>
      <header className="heading">
        <div>
          <p className="eyebrow">
            <Link href="/choisir">Choisir une école</Link> · <Link href={`/ecoles/${ecole.code}`}>{ecole.code}</Link> · <Link href={`/ecoles/${ecole.code}/frais`}>Frais scolaires</Link>
          </p>
          <h1>Fixer des frais</h1>
          <p className="sub">Saisissez les frais une fois, puis choisissez toutes les classes qui paient les mêmes montants.</p>
        </div>
      </header>
      {annee ? (
        <FormFrais ecole={ecole.code} annee={{ id: annee.id, libelle: annee.libelle }} mois={moisDeLAnnee(annee.debut, annee.fin)} classes={classes} classeInitiale={classe ?? null} />
      ) : (
        <div className="notice">Aucune année scolaire active : ouvrez d’abord une année.</div>
      )}
    </>
  )
}

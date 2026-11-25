import { Pencil } from 'lucide-react'
import Link from 'next/link'

import { OngletsEcole } from '@/components/admin/onglets-ecole'
import { libelleLignes, libelleMois, libelleTotal } from '@/components/frais/resume-frais'
import { ecoleAccessible } from '@/lib/acces'
import { anneeActive, lireGrille, moisDeLAnnee } from '@/lib/frais/service'
import { CYCLES, montant, ORDRE_CYCLES } from '@/lib/libelles'
import { lireEnTantQueConnecte } from '@/lib/session'
import type { Classe } from '@/lib/types'

/** Grille des frais de l'école : consultée par tous, fixée par l'administrateur. */
export default async function GrilleFrais({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const { profil, ecoleOuverte: ecole } = await ecoleAccessible(code)
  const admin = profil.role === 'ADMIN'
  const { annee, classes, grille } = await lireEnTantQueConnecte(async (q) => {
    const annee = await anneeActive(q)
    const classes = await q<Classe>(
      `select id::text, ecole_id::text, cycle::text as cycle, niveau, option_code, libelle, ordre, actif
         from classes where ecole_id = $1 and actif order by ordre, libelle`,
      [ecole.id],
    )
    return { annee, classes, grille: annee ? await lireGrille(q, ecole.id, annee.id) : new Map() }
  })
  const mois = annee ? moisDeLAnnee(annee.debut, annee.fin) : []
  const sansFrais = classes.filter((c) => !grille.has(c.id)).length

  return (
    <>
      <header className="heading">
        <div>
          <p className="eyebrow"><Link href="/choisir">Choisir une école</Link> · <Link href={`/ecoles/${ecole.code}`}>{ecole.code}</Link> · année {annee?.libelle ?? '—'}</p>
          <h1>Frais scolaires</h1>
          <p className="sub">{admin ? 'Fixez les frais de chaque classe : minerval mensuel, tranches, bulletin et autres frais.' : 'Les frais sont fixés par l’administrateur.'}</p>
        </div>
        {admin && annee ? (
          <Link href={`/ecoles/${ecole.code}/frais/modifier`} className="primary"><Pencil size={16} aria-hidden="true" /> Fixer des frais</Link>
        ) : null}
      </header>
      <OngletsEcole code={ecole.code} actif="frais" admin={admin} />

      {!annee ? <div className="notice">Aucune année scolaire active.</div> : null}
      {annee && sansFrais > 0 ? (
        <div className="notice">{sansFrais} classe{sansFrais > 1 ? 's n’ont' : ' n’a'} pas encore de frais : la caisse ne pourra rien leur réclamer.</div>
      ) : null}

      {ORDRE_CYCLES.filter((c) => ecole.cycles.includes(c)).map((cycle) => {
        const liste = classes.filter((c) => c.cycle === cycle)
        if (liste.length === 0) return null
        return (
          <section className="card" key={cycle}>
            <div className="card-head">
              <h2>{CYCLES[cycle]}</h2>
              <p>{liste.length} classe{liste.length > 1 ? 's' : ''}</p>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Classe</th><th className="num">Minerval par mois</th><th>Mois facturés</th><th>Tranches</th>
                    <th>Bulletin</th><th>Autres frais</th><th className="num">Total de l’année</th>
                  </tr>
                </thead>
                <tbody>
                  {liste.map((c) => {
                    const f = grille.get(c.id)
                    return (
                      <tr key={c.id}>
                        <td>
                          {admin ? (
                            <Link href={`/ecoles/${ecole.code}/frais/modifier?classe=${c.id}`} title={`Modifier les frais de ${c.libelle}`}>
                              {c.libelle} <Pencil size={13} aria-hidden="true" />
                            </Link>
                          ) : <strong>{c.libelle}</strong>}
                        </td>
                        {f ? (
                          <>
                            <td className="num">{f.minerval ? montant(f.minerval.montant, f.minerval.devise) : '—'}</td>
                            <td>{f.minerval ? libelleMois(f.minerval.mois, mois) : '—'}</td>
                            <td>{libelleLignes(f.tranches)}</td>
                            <td>{f.bulletin ? montant(f.bulletin.montant, f.bulletin.devise) : '—'}</td>
                            <td>{libelleLignes(f.autres, true)}</td>
                            <td className="num"><strong>{libelleTotal(f)}</strong></td>
                          </>
                        ) : (
                          <td colSpan={6}><span className="badge warn">Frais non fixés</span></td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}
    </>
  )
}

import { tauxRecouvrement } from '@/lib/calculs'
import type { Annee, ClasseAvecTotaux, Totaux } from '@/lib/donnees'
import { CYCLES, ORDRE_CYCLES, montant } from '@/lib/libelles'
import type { Ecole } from '@/lib/types'

function Taux({ paye, du }: { paye: number; du: number }) {
  const t = tauxRecouvrement(paye, du)
  if (t === null) return <span className="badge neutral">—</span>
  const ton = t >= 80 ? 'ok' : t >= 50 ? 'warn' : 'bad'
  return <span className={`badge ${ton}`}>{t.toLocaleString('fr-FR')} %</span>
}

/** Tableau de bord d'une école : indicateurs, puis classes par cycle. */
export function VueEcole({ ecole, annee, classes, total }: { ecole: Ecole; annee: Annee | null; classes: ClasseAvecTotaux[]; total: Totaux }) {
  const devise = ecole.devise_defaut
  const cycles = ORDRE_CYCLES.filter((c) => ecole.cycles.includes(c))

  return (
    <>
      {!annee ? <div className="notice">Aucune année scolaire active : l’administrateur doit en ouvrir une.</div> : null}
      {classes.length === 0 ? (
        <div className="notice">Aucune classe n’est encore configurée pour cette école. Elles seront ajoutées dès que leurs listes seront connues.</div>
      ) : null}

      <section className="kpis" aria-label="Indicateurs">
        <div className="kpi"><span>Élèves inscrits</span><strong>{total.effectif.toLocaleString('fr-FR')}</strong><small>{classes.length} classes</small></div>
        <div className="kpi"><span>Montant dû</span><strong>{montant(total.du, devise)}</strong><small>année {annee?.libelle ?? '—'}</small></div>
        <div className="kpi"><span>Montant payé</span><strong>{montant(total.paye, devise)}</strong><small>taux <Taux paye={total.paye} du={total.du} /></small></div>
        <div className="kpi"><span>Reste à payer</span><strong>{montant(total.reste, devise)}</strong><small>tous élèves confondus</small></div>
      </section>

      {cycles.map((cycle) => {
        const liste = classes.filter((c) => c.cycle === cycle)
        return (
          <section className="card" key={cycle}>
            <div className="card-head">
              <h2>{CYCLES[cycle]}</h2>
              <p>{liste.length} classe{liste.length > 1 ? 's' : ''} · {liste.reduce((a, c) => a + c.effectif, 0)} élèves</p>
            </div>
            {liste.length === 0 ? (
              <div className="empty">Aucune classe configurée pour ce cycle.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Classe</th>
                      <th className="num">Élèves</th>
                      <th className="num">Dû</th>
                      <th className="num">Payé</th>
                      <th className="num">Reste</th>
                      <th className="num">Recouvrement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liste.map((c) => (
                      <tr key={c.id}>
                        <td>{c.libelle}</td>
                        <td className="num">{c.effectif}</td>
                        <td className="num">{montant(c.du, devise)}</td>
                        <td className="num">{montant(c.paye, devise)}</td>
                        <td className="num">{montant(c.reste, devise)}</td>
                        <td className="num"><Taux paye={c.paye} du={c.du} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )
      })}
    </>
  )
}

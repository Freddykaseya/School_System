import Link from 'next/link'

import { tauxRecouvrement } from '@/lib/calculs'
import { ecolesEtTotaux } from '@/lib/donnees'
import { CYCLES, montant } from '@/lib/libelles'
import { requireAdmin } from '@/lib/session'

export default async function AdminEcoles() {
  await requireAdmin()
  const { annee, ecoles } = await ecolesEtTotaux()
  const total = ecoles.reduce((a, e) => ({ effectif: a.effectif + e.effectif, du: a.du + e.du, paye: a.paye + e.paye, reste: a.reste + e.reste }), { effectif: 0, du: 0, paye: 0, reste: 0 })
  const taux = tauxRecouvrement(total.paye, total.du)

  return (
    <>
      <header className="heading">
        <div>
          <p className="eyebrow">Administration · année {annee?.libelle ?? '—'}</p>
          <h1>Toutes les écoles</h1>
          <p className="sub">Montants en francs congolais. Cliquez sur une école pour voir le détail par classe.</p>
        </div>
      </header>

      <section className="kpis" aria-label="Indicateurs du groupe">
        <div className="kpi"><span>Écoles</span><strong>{ecoles.length}</strong><small>{ecoles.reduce((a, e) => a + e.nbClasses, 0)} classes configurées</small></div>
        <div className="kpi"><span>Élèves inscrits</span><strong>{total.effectif.toLocaleString('fr-FR')}</strong><small>toutes écoles</small></div>
        <div className="kpi"><span>Montant payé</span><strong>{montant(total.paye)}</strong><small>sur {montant(total.du)} dus</small></div>
        <div className="kpi"><span>Recouvrement</span><strong>{taux === null ? '—' : `${taux.toLocaleString('fr-FR')} %`}</strong><small>reste {montant(total.reste)}</small></div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Écoles</h2>
          <p>{annee ? `Situation ${annee.libelle}` : 'Aucune année active'}</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>École</th>
                <th>Cycles</th>
                <th className="num">Classes</th>
                <th className="num">Comptes</th>
                <th className="num">Élèves</th>
                <th className="num">Dû</th>
                <th className="num">Payé</th>
                <th className="num">Reste</th>
                <th className="num">Recouvrement</th>
              </tr>
            </thead>
            <tbody>
              {ecoles.map((e) => {
                const t = tauxRecouvrement(e.paye, e.du)
                return (
                  <tr key={e.id}>
                    <td><Link href={`/admin/ecoles/${e.code}`}>{e.code}</Link><div className="sub" style={{ marginTop: 2 }}>{e.nom}</div></td>
                    <td>{e.cycles.map((c) => CYCLES[c]).join(', ')}</td>
                    <td className="num">{e.nbClasses === 0 ? <span className="badge warn">à configurer</span> : e.nbClasses}</td>
                    <td className="num">{e.nbComptes}</td>
                    <td className="num">{e.effectif}</td>
                    <td className="num">{montant(e.du)}</td>
                    <td className="num">{montant(e.paye)}</td>
                    <td className="num">{montant(e.reste)}</td>
                    <td className="num">{t === null ? '—' : `${t.toLocaleString('fr-FR')} %`}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

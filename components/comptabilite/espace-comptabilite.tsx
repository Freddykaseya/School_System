'use client'

import { AlertTriangle, Download, FileSpreadsheet, FileText, Printer, Upload, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'

import { MOIS_MINERVAL, PERIODES, type Agregat, type EleveRapport, type Rapport, type StatutEleve } from '@/lib/comptabilite/analyse'
import { COLONNES_AUTRES, LIBELLES_COLONNES, type Colonne } from '@/lib/comptabilite/colonnes'
import { libelleCle } from '@/lib/comptabilite/classes'
import { montant } from '@/lib/libelles'

type Ecole = { code: string; nom: string }

const STATUTS: Record<StatutEleve, { libelle: string; ton: string }> = {
  en_ordre: { libelle: 'En ordre', ton: 'ok' },
  non_en_ordre: { libelle: 'Non en ordre', ton: 'bad' },
  pris_en_charge: { libelle: 'Pris en charge', ton: 'brand' },
  inconnu: { libelle: 'Inconnu', ton: 'neutral' },
}
const GRAVITES = { haute: { libelle: 'À corriger', ton: 'bad' }, moyenne: { libelle: 'À vérifier', ton: 'warn' }, basse: { libelle: 'Info', ton: 'neutral' } }

const MOIS_COURTS: Partial<Record<Colonne, string>> = {
  SPBR: 'Sept.', OCTB: 'Oct.', NVBR: 'Nov.', DCBR: 'Déc.', JANV: 'Janv.', FVR: 'Févr.', MARS: 'Mars', AVR: 'Avr.', MAI: 'Mai', JUIN: 'Juin',
}

const pct = (t: number | null) => (t === null ? '—' : `${t.toLocaleString('fr-FR')} %`)
const tonTaux = (t: number | null) => (t === null ? 'neutral' : t >= 80 ? 'ok' : t >= 50 ? 'warn' : 'bad')

export function EspaceComptabilite({ ecole, periodeDefaut }: { ecole: Ecole; periodeDefaut: Colonne }) {
  const [periode, setPeriode] = useState<Colonne>(periodeDefaut)
  const [fichiers, setFichiers] = useState<File[]>([])
  const [survol, setSurvol] = useState(false)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [avertissements, setAvertissements] = useState<string[]>([])
  const [rapport, setRapport] = useState<Rapport | null>(null)
  const [analyseLe, setAnalyseLe] = useState<Date | null>(null)
  const entree = useRef<HTMLInputElement>(null)

  const ajouter = (liste: FileList | null) => {
    if (!liste) return
    const nouveaux = [...liste].filter((f) => /\.(pdf|xlsx)$/i.test(f.name))
    setFichiers((avant) => {
      const noms = new Set(avant.map((f) => f.name))
      return [...avant, ...nouveaux.filter((f) => !noms.has(f.name))].sort((a, b) => a.name.localeCompare(b.name))
    })
  }

  const analyserFichiers = async () => {
    setEnCours(true)
    setErreur(null)
    setAvertissements([])
    try {
      const fd = new FormData()
      fd.append('ecole', ecole.code)
      fd.append('periode', periode)
      for (const f of fichiers) fd.append('fichiers', f)
      const reponse = await fetch('/api/comptabilite/analyse', { method: 'POST', body: fd })
      const json = await reponse.json().catch(() => null)
      if (!reponse.ok || !json?.rapport) {
        setErreur(json?.erreur ?? 'L’analyse n’a pas abouti. Réessayez.')
        setAvertissements(json?.avertissements ?? [])
        return
      }
      setRapport(json.rapport)
      setAvertissements(json.avertissements ?? [])
      setAnalyseLe(new Date())
    } catch {
      setErreur('Le serveur ne répond pas. Vérifiez que l’application est lancée.')
    } finally {
      setEnCours(false)
    }
  }

  const nbPdf = fichiers.filter((f) => /\.pdf$/i.test(f.name)).length
  const nbExcel = fichiers.length - nbPdf

  return (
    <>
      <section className="card ecran-seulement">
        <div className="card-head">
          <h2>Analyser les fichiers de {ecole.code}</h2>
          <p>PDF « Tableau de bord » (payé) et Excel « Restant dû »</p>
        </div>
        <div className="form-grid">
          <label className="field">
            Situation arrêtée à la fin de
            <select value={periode} onChange={(e) => setPeriode(e.target.value as Colonne)}>
              {PERIODES.map((p) => <option key={p} value={p}>{LIBELLES_COLONNES[p]}</option>)}
            </select>
          </label>
        </div>

        <div
          className={`depot${survol ? ' survol' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setSurvol(true) }}
          onDragLeave={() => setSurvol(false)}
          onDrop={(e) => { e.preventDefault(); setSurvol(false); ajouter(e.dataTransfer.files) }}
          onClick={() => entree.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') entree.current?.click() }}
        >
          <Upload size={28} aria-hidden="true" />
          <strong>Déposez les fichiers ici, ou cliquez pour les choisir</strong>
          <span>Plusieurs PDF (une classe par fichier) et un fichier Excel .xlsx</span>
          <input ref={entree} type="file" accept=".pdf,.xlsx" multiple hidden onChange={(e) => { ajouter(e.target.files); e.target.value = '' }} />
        </div>

        {fichiers.length > 0 ? (
          <div className="fichiers">
            <div className="fichiers-tete">
              <span>{nbPdf} PDF · {nbExcel} Excel</span>
              <button className="link-button" type="button" onClick={() => setFichiers([])}>Tout retirer</button>
            </div>
            <ul>
              {fichiers.map((f) => (
                <li key={f.name}>
                  {/\.pdf$/i.test(f.name) ? <FileText size={14} aria-hidden="true" /> : <FileSpreadsheet size={14} aria-hidden="true" />}
                  {f.name}
                  <button type="button" aria-label={`Retirer ${f.name}`} onClick={() => setFichiers((l) => l.filter((x) => x !== f))}><X size={12} /></button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="form-actions" style={{ paddingTop: 16 }}>
          <button className="primary compact" type="button" disabled={enCours || fichiers.length === 0} onClick={analyserFichiers}>
            {enCours ? 'Analyse en cours…' : 'Analyser les fichiers'}
          </button>
          <span className="sub" style={{ margin: 0 }}>Les fichiers sont lus puis oubliés : rien n’est enregistré.</span>
        </div>
        {erreur ? <div className="error form-message" role="alert">{erreur}</div> : null}
        {avertissements.length > 0 ? (
          <div className="notice" style={{ margin: '0 18px 18px' }}>
            {avertissements.map((a) => <div key={a}>{a}</div>)}
          </div>
        ) : null}
      </section>

      {rapport && analyseLe ? (
        <Resultats rapport={rapport} ecole={ecole} analyseLe={analyseLe} />
      ) : null}
    </>
  )
}

function Resultats({ rapport, ecole, analyseLe }: { rapport: Rapport; ecole: Ecole | undefined; analyseLe: Date }) {
  const t = rapport.total
  const fin = LIBELLES_COLONNES[rapport.periode].toLowerCase()
  const graves = rapport.resume.filter((r) => r.gravite === 'haute').reduce((s, r) => s + r.nombre, 0)

  return (
    <>
      <div className="barre-actions ecran-seulement">
        <h2>Résultat · {ecole?.code} · situation à fin {fin}</h2>
        <div>
          <button className="secondary" type="button" onClick={() => telechargerCsv(rapport, ecole)}>
            <Download size={15} aria-hidden="true" /> Liste des élèves (Excel)
          </button>
          <button className="primary compact" type="button" onClick={() => window.print()}>
            <Printer size={15} aria-hidden="true" /> Générer le rapport (PDF)
          </button>
        </div>
      </div>

      <div className="ecran-seulement">
        <section className="kpis" aria-label="Indicateurs">
          <div className="kpi"><span>Élèves</span><strong>{t.effectif.toLocaleString('fr-FR')}</strong><small>{rapport.classes.length} classes · {rapport.fichiers.pdf.length} PDF</small></div>
          <div className="kpi"><span>Encaissé (PDF)</span><strong>{montant(t.totalPaye)}</strong><small>minerval, tranches et bulletins</small></div>
          <div className="kpi"><span>Recouvrement à fin {fin}</span><strong>{pct(t.taux)}</strong><small>sur {t.baseTaux} élèves présents dans les deux fichiers</small></div>
          <div className="kpi"><span>Reste dû à fin {fin}</span><strong>{montant(t.restantPeriode)}</strong><small>minerval, d’après l’Excel</small></div>
        </section>
        <section className="kpis" aria-label="Situation des élèves">
          <div className="kpi"><span>En ordre</span><strong>{t.enOrdre}</strong><small>rien de dû à fin {fin}</small></div>
          <div className="kpi"><span>Non en ordre</span><strong>{t.nonEnOrdre}</strong><small>au moins un mois dû</small></div>
          <div className="kpi"><span>Pris en charge</span><strong>{t.prisEnCharge}</strong><small>mention PR, BONUS, PROF…</small></div>
          <div className="kpi"><span>Incohérences</span><strong>{rapport.anomalies.length}</strong><small>dont {graves} à corriger</small></div>
        </section>

        <GraphiqueEncaissements total={t} />
        <TableauClasses rapport={rapport} />
        <Anomalies rapport={rapport} />
        <ListeEleves eleves={rapport.eleves} periode={rapport.periode} />
      </div>

      <RapportImprimable rapport={rapport} ecole={ecole} analyseLe={analyseLe} />
    </>
  )
}

/** Encaissements par mois : une série, barres verticales, info-bulle au survol. */
function GraphiqueEncaissements({ total }: { total: Agregat }) {
  const mois: Colonne[] = [...MOIS_MINERVAL, 'JUIN']
  const max = Math.max(1, ...mois.map((m) => total.paye[m]))
  const plusFort = mois.reduce((a, b) => (total.paye[b] > total.paye[a] ? b : a), mois[0])
  return (
    <section className="card">
      <div className="card-head">
        <h2>Encaissements par mois (minerval)</h2>
        <p>
          Tranches : {COLONNES_AUTRES.filter((c) => c !== 'BULLETIN').map((c) => montant(total.paye[c])).join(' · ')} · Bulletins : {montant(total.paye.BULLETIN)}
        </p>
      </div>
      <div className="barres" role="img" aria-label="Montants encaissés par mois">
        {mois.map((m) => {
          const v = total.paye[m]
          return (
            <div key={m} className="barre-colonne">
              <div className="barre-zone">
                {m === plusFort && v > 0 ? <span className="barre-valeur">{montant(v)}</span> : null}
                <div className="barre" style={{ height: `${(v / max) * 100}%` }} tabIndex={0}>
                  <span className="infobulle">{LIBELLES_COLONNES[m]} : {montant(v)}</span>
                </div>
              </div>
              <span className="barre-mois">{MOIS_COURTS[m]}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function TableauClasses({ rapport }: { rapport: Rapport }) {
  const t = rapport.total
  return (
    <section className="card">
      <div className="card-head">
        <h2>Par classe</h2>
        <p>Payé et reste dû du minerval, de septembre à fin {LIBELLES_COLONNES[rapport.periode].toLowerCase()}</p>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Classe</th><th className="num">Élèves</th><th className="num">Payé</th><th className="num">Reste dû</th>
              <th className="num">Recouvrement</th><th className="num">En ordre</th><th className="num">Non en ordre</th><th className="num">Pris en charge</th>
            </tr>
          </thead>
          <tbody>
            {rapport.classes.map((c) => (
              <tr key={c.cle}>
                <td>{c.libelle}</td>
                <td className="num">{c.effectif}</td>
                <td className="num">{montant(c.payePeriode)}</td>
                <td className="num">{montant(c.restantPeriode)}</td>
                <td className="num"><span className={`badge ${tonTaux(c.taux)}`}>{pct(c.taux)}</span></td>
                <td className="num">{c.enOrdre}</td>
                <td className="num">{c.nonEnOrdre}</td>
                <td className="num">{c.prisEnCharge}</td>
              </tr>
            ))}
            <tr className="ligne-total">
              <td>Total</td>
              <td className="num">{t.effectif}</td>
              <td className="num">{montant(t.payePeriode)}</td>
              <td className="num">{montant(t.restantPeriode)}</td>
              <td className="num"><span className={`badge ${tonTaux(t.taux)}`}>{pct(t.taux)}</span></td>
              <td className="num">{t.enOrdre}</td>
              <td className="num">{t.nonEnOrdre}</td>
              <td className="num">{t.prisEnCharge}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Anomalies({ rapport }: { rapport: Rapport }) {
  if (rapport.resume.length === 0) {
    return <section className="card"><div className="empty">Aucune incohérence trouvée entre les fichiers.</div></section>
  }
  return (
    <section className="card">
      <div className="card-head">
        <h2><AlertTriangle size={16} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--warn)' }} />Incohérences à corriger avant l’import</h2>
        <p>Cliquez sur une ligne pour voir le détail</p>
      </div>
      <div className="anomalies">
        {rapport.resume.map((r) => (
          <details key={r.categorie}>
            <summary>
              <span className={`badge ${GRAVITES[r.gravite].ton}`}>{GRAVITES[r.gravite].libelle}</span>
              <span className="anomalie-titre">{r.titre}</span>
              <b>{r.nombre}</b>
            </summary>
            <ul>
              {rapport.anomalies.filter((a) => a.categorie === r.categorie).map((a, i) => <li key={i}>{a.message}</li>)}
            </ul>
          </details>
        ))}
      </div>
    </section>
  )
}

function ListeEleves({ eleves, periode }: { eleves: EleveRapport[]; periode: Colonne }) {
  const [statut, setStatut] = useState<StatutEleve | 'tous'>('non_en_ordre')
  const [classe, setClasse] = useState('toutes')
  const [recherche, setRecherche] = useState('')
  const [limite, setLimite] = useState(100)
  const classes = useMemo(() => [...new Set(eleves.map((e) => e.classe))], [eleves])
  const filtres = eleves.filter(
    (e) => (statut === 'tous' || e.statut === statut) && (classe === 'toutes' || e.classe === classe)
      && (!recherche || e.nom.toLowerCase().includes(recherche.toLowerCase())),
  )
  return (
    <section className="card">
      <div className="card-head">
        <h2>Élèves</h2>
        <p>{filtres.length} élève{filtres.length > 1 ? 's' : ''}</p>
      </div>
      <div className="filtres">
        <div className="tabs" style={{ margin: 0 }}>
          {(['tous', 'non_en_ordre', 'en_ordre', 'pris_en_charge'] as const).map((s) => (
            <button key={s} type="button" className={statut === s ? 'active' : undefined} onClick={() => setStatut(s)}>
              {s === 'tous' ? 'Tous' : STATUTS[s].libelle} · {s === 'tous' ? eleves.length : eleves.filter((e) => e.statut === s).length}
            </button>
          ))}
        </div>
        <select value={classe} onChange={(e) => setClasse(e.target.value)} aria-label="Classe">
          <option value="toutes">Toutes les classes</option>
          {classes.map((c) => <option key={c} value={c}>{c.startsWith('?-') ? c.slice(2) : libelleCle(c)}</option>)}
        </select>
        <input type="search" placeholder="Rechercher un nom…" value={recherche} onChange={(e) => setRecherche(e.target.value)} aria-label="Rechercher un élève" />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Nom</th><th>Classe</th><th className="num">Payé (année)</th><th className="num">Reste dû à fin {LIBELLES_COLONNES[periode].toLowerCase()}</th><th>Statut</th><th>Fichiers</th></tr>
          </thead>
          <tbody>
            {filtres.slice(0, limite).map((e) => (
              <tr key={e.id}>
                <td>{e.nom}</td>
                <td>{e.classe.startsWith('?-') ? e.classe.slice(2) : libelleCle(e.classe)}</td>
                <td className="num">{montant(e.totalPaye)}</td>
                <td className="num">{montant(e.restantPeriode)}</td>
                <td><span className={`badge ${STATUTS[e.statut].ton}`}>{STATUTS[e.statut].libelle}</span></td>
                <td className="sub" style={{ margin: 0 }}>{e.sources.map((s) => (s === 'pdf' ? 'PDF' : 'Excel')).join(' + ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtres.length > limite ? (
        <div className="form-actions" style={{ paddingTop: 14 }}>
          <button className="secondary" type="button" onClick={() => setLimite((l) => l + 200)}>Afficher plus ({filtres.length - limite} restants)</button>
        </div>
      ) : null}
    </section>
  )
}

/** Rapport mis en page pour l'impression (invisible à l'écran). */
function RapportImprimable({ rapport, ecole, analyseLe }: { rapport: Rapport; ecole: Ecole | undefined; analyseLe: Date }) {
  const t = rapport.total
  const fin = LIBELLES_COLONNES[rapport.periode].toLowerCase()
  const mois: Colonne[] = [...MOIS_MINERVAL, 'JUIN', ...COLONNES_AUTRES]
  const nonEnOrdre = rapport.classes
    .map((c) => ({ c, eleves: rapport.eleves.filter((e) => e.classe === c.cle && e.statut === 'non_en_ordre') }))
    .filter((x) => x.eleves.length > 0)
  return (
    <article className="rapport-impression">
      <header>
        <h1>Rapport comptable — {ecole ? `${ecole.code} · ${ecole.nom}` : rapport.etablissement}</h1>
        <p>
          Situation arrêtée à fin {fin} · rapport établi le {analyseLe.toLocaleDateString('fr-FR')} à {analyseLe.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          {' '}· {rapport.fichiers.pdf.length} PDF « Tableau de bord »{rapport.fichiers.excel ? ` et « ${rapport.fichiers.excel} »` : ''}
        </p>
      </header>

      <h2>1. Synthèse</h2>
      <table>
        <tbody>
          <tr><th>Élèves</th><td>{t.effectif} ({rapport.classes.length} classes)</td></tr>
          <tr><th>Total encaissé (PDF)</th><td>{montant(t.totalPaye)}</td></tr>
          <tr><th>Minerval payé, septembre à fin {fin}</th><td>{montant(t.payePeriode)}</td></tr>
          <tr><th>Minerval restant dû à fin {fin}</th><td>{montant(t.restantPeriode)}</td></tr>
          <tr><th>Taux de recouvrement</th><td>{pct(t.taux)} (élèves présents dans les deux fichiers : {t.baseTaux})</td></tr>
          <tr><th>Élèves en ordre / non en ordre / pris en charge</th><td>{t.enOrdre} / {t.nonEnOrdre} / {t.prisEnCharge}</td></tr>
          <tr><th>Incohérences relevées</th><td>{rapport.anomalies.length}</td></tr>
        </tbody>
      </table>

      <h2>2. Encaissements par mois</h2>
      <table>
        <thead><tr><th>Mois</th><th className="num">Encaissé</th><th className="num">Restant dû</th></tr></thead>
        <tbody>
          {mois.map((m) => <tr key={m}><td>{LIBELLES_COLONNES[m]}</td><td className="num">{montant(t.paye[m])}</td><td className="num">{montant(t.restant[m])}</td></tr>)}
        </tbody>
      </table>

      <h2>3. Situation par classe (minerval, septembre à fin {fin})</h2>
      <table>
        <thead><tr><th>Classe</th><th className="num">Élèves</th><th className="num">Payé</th><th className="num">Reste dû</th><th className="num">Recouvrement</th><th className="num">En ordre</th><th className="num">Non en ordre</th></tr></thead>
        <tbody>
          {rapport.classes.map((c) => (
            <tr key={c.cle}><td>{c.libelle}</td><td className="num">{c.effectif}</td><td className="num">{montant(c.payePeriode)}</td><td className="num">{montant(c.restantPeriode)}</td><td className="num">{pct(c.taux)}</td><td className="num">{c.enOrdre}</td><td className="num">{c.nonEnOrdre}</td></tr>
          ))}
        </tbody>
      </table>

      <h2>4. Incohérences entre les fichiers</h2>
      {rapport.resume.length === 0 ? <p>Aucune.</p> : rapport.resume.map((r) => (
        <section key={r.categorie} className="rapport-bloc">
          <h3>{r.titre} ({r.nombre}) — {GRAVITES[r.gravite].libelle}</h3>
          <ul>{rapport.anomalies.filter((a) => a.categorie === r.categorie).map((a, i) => <li key={i}>{a.message}</li>)}</ul>
        </section>
      ))}

      <h2>5. Élèves non en ordre à fin {fin}</h2>
      {nonEnOrdre.map(({ c, eleves }) => (
        <section key={c.cle} className="rapport-bloc">
          <h3>{c.libelle} — {eleves.length} élève{eleves.length > 1 ? 's' : ''}, {montant(eleves.reduce((s, e) => s + e.restantPeriode, 0))}</h3>
          <table>
            <tbody>
              {eleves.map((e) => <tr key={e.id}><td>{e.nom}</td><td className="num">{montant(e.restantPeriode)}</td></tr>)}
            </tbody>
          </table>
        </section>
      ))}
    </article>
  )
}

/** Liste des élèves au format CSV (point-virgule, ouvrable dans Excel). */
function telechargerCsv(rapport: Rapport, ecole: Ecole | undefined) {
  const mois: Colonne[] = [...MOIS_MINERVAL, 'JUIN', ...COLONNES_AUTRES]
  const echapper = (v: string | number) => {
    const s = String(v)
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lignes = [
    ['Classe', 'Nom', 'Statut', 'Payé (année)', `Reste dû à fin ${LIBELLES_COLONNES[rapport.periode].toLowerCase()}`,
      ...mois.map((m) => `Payé ${LIBELLES_COLONNES[m]}`), ...mois.map((m) => `Dû ${LIBELLES_COLONNES[m]}`), 'Fichiers'],
    ...rapport.eleves.map((e) => [
      e.classe.startsWith('?-') ? e.classe.slice(2) : libelleCle(e.classe), e.nom, STATUTS[e.statut].libelle, e.totalPaye, e.restantPeriode,
      ...mois.map((m) => e.paye[m]), ...mois.map((m) => e.restant[m]), e.sources.join('+'),
    ]),
  ]
  const csv = '﻿' + lignes.map((l) => l.map(echapper).join(';')).join('\r\n')
  const lien = document.createElement('a')
  lien.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  lien.download = `eleves-${ecole?.code ?? 'ecole'}-fin-${LIBELLES_COLONNES[rapport.periode].toLowerCase()}.csv`
  lien.click()
  URL.revokeObjectURL(lien.href)
}

'use client'

import { Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useActionState, useMemo, useState } from 'react'

import { enregistrerFraisAction, type EtatFrais } from '@/app/(espace)/ecoles/[code]/frais/actions'
import { totalAnnuel, type FraisClasse, type LigneFrais, type MoisScolaire } from '@/lib/frais/service'
import { montant } from '@/lib/libelles'
import type { Devise } from '@/lib/types'

export type ClasseFrais = { id: string; libelle: string; cycle: string; frais: FraisClasse | null }

// Dans le formulaire, les montants restent du texte (« 70 000 », « 12,50 »).
type Ligne = { libelle: string; montant: string; devise: Devise; mois: string }
type Saisie = {
  minerval: { actif: boolean; montant: string; devise: Devise; mois: string[] }
  tranches: Ligne[]
  bulletin: Ligne & { actif: boolean }
  autres: Ligne[]
}

const lireMontant = (s: string) => Number(s.replace(/[\s  ]/g, '').replace(',', '.'))
// 9000 → « 9 000 » ; 12.5 → « 12,5 » (espaces ordinaires, relus par lireMontant).
const texte = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 2 }).replace(/[  ]/g, ' ')
const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const INITIAL: EtatFrais = { erreur: null, succes: null, fois: 0 }

function versSaisie(f: FraisClasse | null, mois: MoisScolaire[]): Saisie {
  const defaut = mois.filter((m) => !/juin|juillet|août/.test(m.nom)).map((m) => m.cle)
  const valides = new Set(mois.map((m) => m.cle))
  // Un frais enregistré sans mois d'échéance (anciennes données) reçoit un
  // mois proposé, visible et modifiable avant d'enregistrer.
  const ligne = (l: LigneFrais, propose: number): Ligne => ({
    libelle: l.libelle, montant: texte(l.montant), devise: l.devise,
    mois: valides.has(l.mois) ? l.mois : (mois[Math.min(propose, mois.length - 1)]?.cle ?? ''),
  })
  return {
    minerval: f?.minerval
      ? { actif: true, montant: texte(f.minerval.montant), devise: f.minerval.devise, mois: f.minerval.mois }
      : { actif: !f, montant: '', devise: 'CDF', mois: defaut },
    tranches: f ? f.tranches.map((l, i) => ligne(l, 1 + i * 3)) : [],
    bulletin: f?.bulletin ? { ...ligne(f.bulletin, 3), actif: true } : { actif: false, libelle: 'Bulletin', montant: '', devise: 'CDF', mois: mois[3]?.cle ?? '' },
    autres: f ? f.autres.map((l) => ligne(l, 0)) : [],
  }
}

function versFrais(s: Saisie): FraisClasse {
  const ligne = (l: Ligne): LigneFrais => ({ libelle: l.libelle, montant: lireMontant(l.montant), devise: l.devise, mois: l.mois })
  return {
    minerval: s.minerval.actif ? { montant: lireMontant(s.minerval.montant), devise: s.minerval.devise, mois: s.minerval.mois } : null,
    tranches: s.tranches.map(ligne),
    bulletin: s.bulletin.actif ? ligne(s.bulletin) : null,
    autres: s.autres.map(ligne),
  }
}

function ChampsLigne({ l, mois, changer, retirer, sansNom }: {
  l: Ligne; mois: MoisScolaire[]; changer: (l: Ligne) => void; retirer?: () => void; sansNom?: boolean
}) {
  return (
    <div className={`ligne-frais${sansNom ? ' courte' : ''}`}>
      {sansNom ? null : (
        <label className="field">Nom<input value={l.libelle} onChange={(e) => changer({ ...l, libelle: e.target.value })} required /></label>
      )}
      <label className="field">Montant<input value={l.montant} inputMode="decimal" onChange={(e) => changer({ ...l, montant: e.target.value })} placeholder="0" required /></label>
      <label className="field">Monnaie
        <select value={l.devise} onChange={(e) => changer({ ...l, devise: e.target.value as Devise })}><option value="CDF">FC</option><option value="USD">$</option></select>
      </label>
      <label className="field">À payer en
        <select value={l.mois} onChange={(e) => changer({ ...l, mois: e.target.value })}>{mois.map((m) => <option key={m.cle} value={m.cle}>{m.nom}</option>)}</select>
      </label>
      {retirer ? <button type="button" className="icone-bouton" onClick={retirer} aria-label={`Retirer ${l.libelle || 'ce frais'}`}><Trash2 size={18} /></button> : null}
    </div>
  )
}

export function FormFrais({ ecole, annee, mois, classes, classeInitiale }: {
  ecole: string; annee: { id: string; libelle: string }; mois: MoisScolaire[]; classes: ClasseFrais[]; classeInitiale: string | null
}) {
  const depart = classes.find((c) => c.id === classeInitiale) ?? null
  const [saisie, setSaisie] = useState<Saisie>(() => versSaisie(depart?.frais ?? null, mois))
  const [choisies, setChoisies] = useState<Set<string>>(new Set(depart ? [depart.id] : []))
  const [etat, action, enCours] = useActionState(enregistrerFraisAction, INITIAL)
  const frais = useMemo(() => versFrais(saisie), [saisie])
  const total = totalAnnuel(frais)
  const cycles = [...new Set(classes.map((c) => c.cycle))]

  const basculer = (ids: string[], tous: boolean) =>
    setChoisies((s) => { const n = new Set(s); for (const id of ids) (tous ? n.add(id) : n.delete(id)); return n })
  const prochainMois = (l: Ligne[]) => mois[Math.min(mois.findIndex((m) => m.cle === l.at(-1)?.mois) + 3, mois.length - 1)]?.cle ?? mois[0].cle

  return (
    <form action={action}>
      <input type="hidden" name="ecole" value={ecole} />
      <input type="hidden" name="annee" value={annee.id} />
      <input type="hidden" name="frais" value={JSON.stringify(frais)} />
      {[...choisies].map((id) => <input key={id} type="hidden" name="classes" value={id} />)}

      <section className="card">
        <div className="card-head">
          <h2>1. Les frais</h2>
          <label className="field depart">Partir des frais de
            <select defaultValue={depart?.id ?? ''} onChange={(e) => setSaisie(versSaisie(classes.find((c) => c.id === e.target.value)?.frais ?? null, mois))}>
              <option value="">— grille vide —</option>
              {classes.filter((c) => c.frais).map((c) => <option key={c.id} value={c.id}>{c.libelle}</option>)}
            </select>
          </label>
        </div>

        <div className="bloc-frais">
          <label className="check"><input type="checkbox" checked={saisie.minerval.actif} onChange={(e) => setSaisie({ ...saisie, minerval: { ...saisie.minerval, actif: e.target.checked } })} /> <strong>Minerval mensuel</strong></label>
          {saisie.minerval.actif ? (
            <>
              <div className="ligne-frais minerval">
                <label className="field">Montant par mois<input value={saisie.minerval.montant} inputMode="decimal" placeholder="ex. 70 000" onChange={(e) => setSaisie({ ...saisie, minerval: { ...saisie.minerval, montant: e.target.value } })} required /></label>
                <label className="field">Monnaie
                  <select value={saisie.minerval.devise} onChange={(e) => setSaisie({ ...saisie, minerval: { ...saisie.minerval, devise: e.target.value as Devise } })}><option value="CDF">FC</option><option value="USD">$</option></select>
                </label>
              </div>
              <div className="mois-choix" role="group" aria-label="Mois facturés">
                {mois.map((m) => {
                  const actif = saisie.minerval.mois.includes(m.cle)
                  return (
                    <button key={m.cle} type="button" aria-pressed={actif} className={actif ? 'active' : undefined}
                      onClick={() => setSaisie({ ...saisie, minerval: { ...saisie.minerval, mois: actif ? saisie.minerval.mois.filter((x) => x !== m.cle) : [...saisie.minerval.mois, m.cle].sort() } })}>
                      {majuscule(m.nom)}
                    </button>
                  )
                })}
              </div>
            </>
          ) : null}
        </div>

        <div className="bloc-frais">
          <strong>Tranches</strong>
          {saisie.tranches.map((l, i) => (
            <ChampsLigne key={i} l={l} mois={mois} changer={(n) => setSaisie({ ...saisie, tranches: saisie.tranches.map((x, j) => (j === i ? n : x)) })}
              retirer={() => setSaisie({ ...saisie, tranches: saisie.tranches.filter((_, j) => j !== i) })} />
          ))}
          <button type="button" className="secondary" onClick={() => setSaisie({ ...saisie, tranches: [...saisie.tranches, {
            libelle: `Tranche ${saisie.tranches.length + 1}`, montant: saisie.tranches.at(-1)?.montant ?? '', devise: saisie.tranches.at(-1)?.devise ?? 'CDF', mois: prochainMois(saisie.tranches),
          }] })}><Plus size={16} aria-hidden="true" /> Ajouter une tranche</button>
        </div>

        <div className="bloc-frais">
          <label className="check"><input type="checkbox" checked={saisie.bulletin.actif} onChange={(e) => setSaisie({ ...saisie, bulletin: { ...saisie.bulletin, actif: e.target.checked } })} /> <strong>Bulletin</strong></label>
          {saisie.bulletin.actif ? <ChampsLigne l={saisie.bulletin} mois={mois} sansNom changer={(n) => setSaisie({ ...saisie, bulletin: { ...n, actif: true } })} /> : null}
        </div>

        <div className="bloc-frais">
          <strong>Autres frais</strong> <span className="sub" style={{ margin: 0 }}>uniforme, transport, examen…</span>
          {saisie.autres.map((l, i) => (
            <ChampsLigne key={i} l={l} mois={mois} changer={(n) => setSaisie({ ...saisie, autres: saisie.autres.map((x, j) => (j === i ? n : x)) })}
              retirer={() => setSaisie({ ...saisie, autres: saisie.autres.filter((_, j) => j !== i) })} />
          ))}
          <button type="button" className="secondary" onClick={() => setSaisie({ ...saisie, autres: [...saisie.autres, { libelle: '', montant: '', devise: 'CDF', mois: mois[0].cle }] })}>
            <Plus size={16} aria-hidden="true" /> Ajouter un frais
          </button>
        </div>

        <div className="total-frais">
          Total de l’année par élève :{' '}
          <strong>{(Object.entries(total) as [Devise, number][]).filter(([, v]) => Number.isFinite(v)).map(([d, v]) => montant(v, d)).join(' + ') || '—'}</strong>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>2. Les classes concernées</h2>
          <p>{choisies.size} classe{choisies.size > 1 ? 's' : ''} choisie{choisies.size > 1 ? 's' : ''} · année {annee.libelle}</p>
        </div>
        {cycles.map((cycle) => {
          const liste = classes.filter((c) => c.cycle === cycle)
          const toutes = liste.every((c) => choisies.has(c.id))
          return (
            <div className="bloc-frais" key={cycle}>
              <label className="check"><input type="checkbox" checked={toutes} onChange={(e) => basculer(liste.map((c) => c.id), e.target.checked)} /> <strong>{cycle}</strong></label>
              <div className="mois-choix">
                {liste.map((c) => (
                  <button key={c.id} type="button" aria-pressed={choisies.has(c.id)} className={choisies.has(c.id) ? 'active' : undefined} onClick={() => basculer([c.id], !choisies.has(c.id))}>
                    {c.libelle}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
        <div className="form-actions" style={{ paddingTop: 16 }}>
          <button className="primary" type="submit" disabled={enCours || choisies.size === 0}>
            {enCours ? 'Enregistrement…' : `Enregistrer pour ${choisies.size} classe${choisies.size > 1 ? 's' : ''}`}
          </button>
          <Link href={`/ecoles/${ecole}/frais`} className="secondary">Retour à la grille</Link>
        </div>
        {etat.erreur ? <div className="error form-message" role="alert">{etat.erreur}</div> : null}
        {etat.succes ? <div className="success form-message" role="status">{etat.succes} <Link href={`/ecoles/${ecole}/frais`}>Voir la grille</Link></div> : null}
      </section>
    </form>
  )
}

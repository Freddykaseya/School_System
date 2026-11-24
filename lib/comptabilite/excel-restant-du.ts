import ExcelJS from 'exceljs'

import { normaliser } from './classes.ts'
import { COLONNES, LIBELLES_COLONNES, type Anomalie, type Cellule, type Colonne } from './pdf-tableau-de-bord.ts'

/*
 * Lecture de l'Excel « Restant dû » (montants RESTANT DUS). Deux sortes de
 * feuilles, reconnues à leur en-tête :
 *   - détail : une ligne par élève (N°, NOM, CLASSE, FRAIS, mois...), une
 *     ou plusieurs classes par feuille, chacune suivie d'un TOTAL ;
 *   - synthèse : une ligne par classe (CLASSE, EFFECTIF, SEPTEMBRE...).
 */

export type LigneRestant = {
  numero: number | null
  nom: string
  classe: string
  frais: number | null
  moisInscription: string | null
  montants: Record<Colonne, Cellule>
  feuille: string
  ligne: number
}

export type SectionRestant = {
  feuille: string
  classe: string
  eleves: LigneRestant[]
  totalImprime: Partial<Record<Colonne, number>> | null
  totalCalcule: Record<Colonne, number>
}

export type LigneSynthese = { classe: string; effectif: number | null; montants: Partial<Record<Colonne, number>>; ligne: number }
export type Synthese = { feuille: string; lignes: LigneSynthese[] }

export type RestantDu = {
  fichier: string
  titre: string | null
  sections: SectionRestant[]
  syntheses: Synthese[]
  anomalies: (Anomalie & { feuille?: string; ligne?: number })[]
}

// Synonymes des en-têtes de colonnes (comparés sans espaces).
const SYNONYMES: Record<string, Colonne> = {
  SPBR: 'SPBR', SEPTEMBRE: 'SPBR', SEPT: 'SPBR',
  OCTB: 'OCTB', OCTOBRE: 'OCTB',
  NVBR: 'NVBR', NOVEMBRE: 'NVBR',
  DCBR: 'DCBR', DECEMBRE: 'DCBR',
  JANV: 'JANV', JANVIER: 'JANV',
  FVR: 'FVR', FEV: 'FVR', FEVRIER: 'FVR',
  MARS: 'MARS',
  AVR: 'AVR', AVRIL: 'AVR',
  MAI: 'MAI',
  JUIN: 'JUIN',
  '1TRANCH': '1TRANCH', '1TRANCHE': '1TRANCH', '1ERETRANCHE': '1TRANCH',
  '2TRANCH': '2TRANCH', '2TRANCHE': '2TRANCH', '2EMETRANCHE': '2TRANCH',
  '3TRANCH': '3TRANCH', '3TRANCHE': '3TRANCH', '3EMETRANCHE': '3TRANCH',
  BULLETIN: 'BULLETIN',
}

type Valeur = { nombre: number | null; texte: string | null; formuleSansResultat: boolean }

/** Contenu d'une cellule, quelle que soit sa forme (texte riche, formule...). */
function lireValeur(v: ExcelJS.CellValue): Valeur {
  if (v === null || v === undefined) return { nombre: null, texte: null, formuleSansResultat: false }
  if (typeof v === 'number') return { nombre: v, texte: null, formuleSansResultat: false }
  if (typeof v === 'string') {
    const t = v.trim()
    if (t === '') return { nombre: null, texte: null, formuleSansResultat: false }
    return /^\d+$/.test(t) ? { nombre: Number(t), texte: null, formuleSansResultat: false } : { nombre: null, texte: t, formuleSansResultat: false }
  }
  if (typeof v === 'boolean' || v instanceof Date) return { nombre: null, texte: String(v), formuleSansResultat: false }
  if ('richText' in v) return lireValeur(v.richText.map((r) => r.text).join(''))
  if ('formula' in v || 'sharedFormula' in v) {
    const r = (v as { result?: unknown }).result
    if (r === undefined || r === null) return { nombre: null, texte: null, formuleSansResultat: true }
    if (typeof r === 'object' && r && 'error' in r) return { nombre: null, texte: String((r as { error: string }).error), formuleSansResultat: false }
    return lireValeur(r as ExcelJS.CellValue)
  }
  if ('text' in v) return lireValeur((v as { text: string }).text)
  if ('error' in v) return { nombre: null, texte: String(v.error), formuleSansResultat: false }
  return { nombre: null, texte: null, formuleSansResultat: false }
}

const texteDe = (v: ExcelJS.CellValue) => {
  const l = lireValeur(v)
  return l.texte ?? (l.nombre !== null ? String(l.nombre) : '')
}

type EnTeteDetail = { type: 'detail'; numero?: number; nom: number; classe: number; frais?: number; mois?: number; colonnes: Map<Colonne, number> }
type EnTeteSynthese = { type: 'synthese'; classe: number; effectif?: number; colonnes: Map<Colonne, number> }

function reconnaitreEnTete(cellules: string[]): EnTeteDetail | EnTeteSynthese | null {
  const colonnes = new Map<Colonne, number>()
  let numero: number | undefined, nom: number | undefined, classe: number | undefined
  let frais: number | undefined, mois: number | undefined, effectif: number | undefined
  cellules.forEach((brut, i) => {
    const t = normaliser(brut)
    const compact = t.replace(/ /g, '')
    if (!t) return
    if (SYNONYMES[compact] && !colonnes.has(SYNONYMES[compact])) colonnes.set(SYNONYMES[compact], i)
    else if (/^N( ?O)?$/.test(t) || brut.trim() === 'N°') numero = i
    else if (t.startsWith('NOM')) nom = i
    else if (t === 'CLASSE') classe = i
    else if (t === 'FRAIS' || t === 'T') frais = i
    else if (t.startsWith('MOIS')) mois = i
    else if (t.startsWith('EFFECTIF')) effectif = i
  })
  if (classe === undefined || colonnes.size < 8) return null
  if (nom !== undefined) return { type: 'detail', numero, nom, classe, frais, mois, colonnes }
  return { type: 'synthese', classe, effectif, colonnes }
}

const vide = () => Object.fromEntries(COLONNES.map((c) => [c, { valeur: null, brut: null }])) as Record<Colonne, Cellule>
const sommes = (eleves: LigneRestant[]) =>
  Object.fromEntries(COLONNES.map((c) => [c, eleves.reduce((s, e) => s + (e.montants[c].valeur ?? 0), 0)])) as Record<Colonne, number>

export async function lireRestantDu(fichier: string, contenu: ArrayBuffer): Promise<RestantDu> {
  const classeur = new ExcelJS.Workbook()
  await classeur.xlsx.load(contenu)
  const resultat: RestantDu = { fichier, titre: null, sections: [], syntheses: [], anomalies: [] }

  for (const feuille of classeur.worksheets) {
    if (feuille.state !== 'visible' || feuille.rowCount === 0) continue
    const nomFeuille = feuille.name.trim()
    let entete: EnTeteDetail | EnTeteSynthese | null = null
    let section: SectionRestant | null = null
    let synthese: Synthese | null = null

    const fermerSection = () => {
      if (section && section.eleves.length > 0) {
        section.totalCalcule = sommes(section.eleves)
        const freq = new Map<string, number>()
        for (const e of section.eleves) freq.set(e.classe, (freq.get(e.classe) ?? 0) + 1)
        section.classe = [...freq].sort((a, b) => b[1] - a[1])[0][0]
        resultat.sections.push(section)
      }
      section = null
    }

    for (let i = 1; i <= feuille.rowCount; i++) {
      const ligne = feuille.getRow(i)
      const cellules: ExcelJS.CellValue[] = []
      for (let c = 1; c <= Math.max(feuille.columnCount, ligne.cellCount); c++) cellules.push(ligne.getCell(c).value)
      const textes = cellules.map(texteDe)
      if (textes.every((t) => !t)) continue

      if (!resultat.titre) {
        const titre = textes.find((t) => /RESTANT/i.test(t))
        if (titre) resultat.titre = titre.replace(/\s+/g, ' ').trim()
      }

      const nouvelEnTete = reconnaitreEnTete(textes)
      if (nouvelEnTete) {
        fermerSection()
        entete = nouvelEnTete
        if (entete.type === 'detail') section = { feuille: nomFeuille, classe: '', eleves: [], totalImprime: null, totalCalcule: sommes([]) }
        else {
          synthese = { feuille: nomFeuille, lignes: [] }
          resultat.syntheses.push(synthese)
        }
        continue
      }
      if (!entete) continue

      const lire = (col: number | undefined) => (col === undefined ? lireValeur(null) : lireValeur(cellules[col]))
      const montants = vide()
      for (const [col, idx] of entete.colonnes) {
        const v = lireValeur(cellules[idx])
        if (v.formuleSansResultat) {
          resultat.anomalies.push({
            type: 'formule_sans_resultat', feuille: nomFeuille, ligne: i,
            message: `Feuille « ${nomFeuille} », ligne ${i} : formule sans résultat enregistré (${LIBELLES_COLONNES[col]}).`,
          })
        }
        montants[col] = { valeur: v.nombre, brut: v.texte }
      }

      if (entete.type === 'synthese') {
        const classe = textes[entete.classe]
        if (!classe) continue
        if (/^TOT/i.test(normaliser(classe))) continue
        const valeurs: Partial<Record<Colonne, number>> = {}
        for (const c of COLONNES) if (montants[c].valeur !== null) valeurs[c] = montants[c].valeur!
        synthese!.lignes.push({ classe, effectif: lire(entete.effectif).nombre, montants: valeurs, ligne: i })
        continue
      }

      const nom = textes[entete.nom].replace(/\s+/g, ' ').trim()
      const classe = textes[entete.classe].replace(/\s+/g, ' ').trim()
      if (/^TOTAL/i.test(normaliser(nom)) || /^TOTAL/i.test(normaliser(classe))) {
        if (section) {
          section.totalImprime = {}
          for (const c of COLONNES) if (montants[c].valeur !== null) section.totalImprime[c] = montants[c].valeur!
        }
        fermerSection()
        entete = null // la section suivante commence par son propre en-tête
        continue
      }
      if (!nom || !section) continue
      section.eleves.push({
        numero: lire(entete.numero).nombre,
        nom,
        classe,
        frais: lire(entete.frais).nombre,
        moisInscription: lire(entete.mois).texte,
        montants,
        feuille: nomFeuille,
        ligne: i,
      })
    }
    fermerSection()
  }

  for (const s of resultat.sections) {
    for (const e of s.eleves) {
      for (const c of COLONNES) {
        const brut = e.montants[c].brut
        if (brut !== null) {
          resultat.anomalies.push({
            type: 'texte_dans_montant', feuille: e.feuille, ligne: e.ligne, eleve: e.nom, colonne: c,
            message: `${e.nom} (${e.classe}) : « ${brut} » au lieu d’un montant (${LIBELLES_COLONNES[c]}), feuille « ${e.feuille} » ligne ${e.ligne}.`,
          })
        }
      }
    }
    if (s.totalImprime) {
      for (const c of COLONNES) {
        const imprime = s.totalImprime[c]
        if (imprime !== undefined && imprime !== s.totalCalcule[c]) {
          resultat.anomalies.push({
            type: 'total_faux', feuille: s.feuille, colonne: c,
            message: `${s.classe} (feuille « ${s.feuille} ») — ${LIBELLES_COLONNES[c]} : total écrit ${imprime}, somme des élèves ${s.totalCalcule[c]}.`,
          })
        }
      }
    }
  }
  return resultat
}

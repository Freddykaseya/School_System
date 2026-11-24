/*
 * Lecture des PDF « Tableau de bord » (montants PAYÉS, une classe par
 * fichier). Le texte d'un PDF n'a pas de colonnes : chaque mot a une
 * position. On repère les en-têtes (SPBR, OCTB...) sur chaque page, puis on
 * range chaque nombre dans la colonne sous laquelle il se termine (les
 * montants sont alignés à droite). La ligne TOTAL GENERAL imprimée sert de
 * contrôle : la somme lue doit lui être égale.
 */

import { COLONNES, LIBELLES_COLONNES, type Cellule, type Colonne } from './colonnes.ts'

export { COLONNES, COLONNES_AUTRES, COLONNES_MOIS, LIBELLES_COLONNES, type Cellule, type Colonne } from './colonnes.ts'

export type LigneEleve = {
  numero: number | null
  nom: string
  classe: string
  frais: number | null
  moisInscription: string | null
  montants: Record<Colonne, Cellule>
  page: number
}

export type Anomalie = { type: AnomalieType; message: string; eleve?: string; colonne?: Colonne }
export type AnomalieType =
  | 'texte_dans_montant'
  | 'total_faux'
  | 'ligne_illisible'
  | 'pas_de_total'
  | 'classe_multiple'
  | 'formule_sans_resultat'

export type TableauDeBord = {
  fichier: string
  etablissement: string | null
  classe: string
  eleves: LigneEleve[]
  totalImprime: Partial<Record<Colonne, number>> | null
  totalCalcule: Record<Colonne, number>
  anomalies: Anomalie[]
}

/** Un mot du PDF avec sa position (en points, origine en bas à gauche). */
export type Mot = { x: number; fin: number; y: number; texte: string; page: number }

const EN_TETES = ['N°', 'NOM', 'CLASSE', 'FRAIS', 'MOIS', ...COLONNES] as const
type EnTete = (typeof EN_TETES)[number]

const normaliser = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim()

/** Découpe un élément de texte en mots, avec la position estimée de chacun. */
export function decouper(texte: string, x: number, largeur: number, y: number, page: number): Mot[] {
  const mots: Mot[] = []
  const parCaractere = texte.length > 0 ? largeur / texte.length : 0
  for (const m of texte.matchAll(/\S+/g)) {
    const debut = x + (m.index ?? 0) * parCaractere
    mots.push({ x: debut, fin: debut + m[0].length * parCaractere, y, texte: m[0], page })
  }
  return mots
}

/** Regroupe les mots en lignes (même hauteur, à 2 points près), de haut en bas. */
function lignes(mots: Mot[]): Mot[][] {
  const tries = [...mots].sort((a, b) => b.y - a.y || a.x - b.x)
  const resultat: Mot[][] = []
  for (const m of tries) {
    const derniere = resultat.at(-1)
    if (derniere && Math.abs(derniere[0].y - m.y) <= 2) derniere.push(m)
    else resultat.push([m])
  }
  return resultat.map((l) => l.sort((a, b) => a.x - b.x))
}

/** Position de début de chaque colonne, d'après la ligne d'en-tête. */
function positionsEnTete(ligne: Mot[]): Map<EnTete, number> | null {
  const pos = new Map<EnTete, number>()
  for (const m of ligne) {
    const t = normaliser(m.texte)
    if (t === 'N°' || t === 'NO' || t === 'N') pos.set('N°', m.x)
    else if (t === 'NOM') pos.set('NOM', m.x)
    else if (t === 'CLASSE') pos.set('CLASSE', m.x)
    else if (t === 'FRAIS') pos.set('FRAIS', m.x)
    else if (t === 'MOIS') pos.set('MOIS', m.x)
    else if ((COLONNES as readonly string[]).includes(t)) pos.set(t as Colonne, m.x)
  }
  const indispensables: EnTete[] = ['CLASSE', 'FRAIS', ...COLONNES]
  return indispensables.every((c) => pos.has(c)) ? pos : null
}

const ENTIER = /^\d+$/

function cellule(textes: string[]): Cellule {
  if (textes.length === 0) return { valeur: null, brut: null }
  const brut = textes.join(' ')
  if (textes.length === 1 && ENTIER.test(brut)) return { valeur: Number(brut), brut: null }
  return { valeur: null, brut }
}

function celluleVide(): Record<Colonne, Cellule> {
  return Object.fromEntries(COLONNES.map((c) => [c, { valeur: null, brut: null }])) as Record<Colonne, Cellule>
}

/**
 * Analyse les mots d'un tableau de bord (toutes pages confondues). Séparé
 * de la lecture du fichier pour être testé sans PDF.
 */
export function analyserMots(fichier: string, mots: Mot[]): TableauDeBord {
  const anomalies: Anomalie[] = []
  const eleves: LigneEleve[] = []
  let etablissement: string | null = null
  let totalImprime: Partial<Record<Colonne, number>> | null = null

  const pages = [...new Set(mots.map((m) => m.page))].sort((a, b) => a - b)
  // Les pages suivantes ne répètent pas l'en-tête : même mise en page que
  // la page précédente.
  let pos: Map<EnTete, number> | null = null
  // Ligne en cours (élève ou total) et textes lus dans chaque colonne.
  let cible: LigneEleve | 'total' | null = null
  const textes = new Map<LigneEleve | 'total', Map<Colonne, string[]>>()
  for (const page of pages) {
    const lignesPage = lignes(mots.filter((m) => m.page === page))
    let iEnTete = lignesPage.findIndex((l) => positionsEnTete(l) !== null)
    if (iEnTete >= 0) pos = positionsEnTete(lignesPage[iEnTete])!
    else iEnTete = lignesPage.findIndex((l) => /TABLEAU DE BORD/i.test(l.map((m) => m.texte).join(' ')))
    if (!pos) continue
    for (const l of lignesPage.slice(0, Math.max(iEnTete, 0))) {
      const t = l.map((m) => m.texte).join(' ')
      if (!etablissement && /[A-Z]{2,}/.test(t) && !/TABLEAU DE BORD/i.test(t) && !/^\d+$/.test(t)) etablissement = t
    }

    // Bornes des colonnes de montants : de son début au début de la suivante.
    const colonnes = pos
    const debuts = COLONNES.map((c) => colonnes.get(c)!)
    const colonneDe = (m: Mot): Colonne | null => {
      for (let i = COLONNES.length - 1; i >= 0; i--) if (m.fin >= debuts[i] - 1) return COLONNES[i]
      return null
    }
    const debutClasse = pos.get('CLASSE')!
    const debutFrais = pos.get('FRAIS')!

    for (const ligne of lignesPage.slice(iEnTete + 1)) {
      const gauche = ligne.filter((m) => m.fin < debuts[0] - 1)
      const droite = ligne.filter((m) => m.fin >= debuts[0] - 1)
      // Nom et classe sont parfois fusionnés en un seul bloc : la position
      // estimée de chaque mot décide (marge de 6 points avant « CLASSE »).
      const nomMots = gauche.filter((m) => m.x < debutClasse - 6)
      const classeMots = gauche.filter((m) => m.x >= debutClasse - 6 && m.x < debutFrais - 6)
      const fraisMots = gauche.filter((m) => m.x >= debutFrais - 6)

      const texteNom = nomMots.map((m) => m.texte).join(' ')
      const parColonne = new Map<Colonne, string[]>()
      for (const m of droite) {
        const c = colonneDe(m)
        if (c) parColonne.set(c, [...(parColonne.get(c) ?? []), m.texte])
      }

      if (/^TOTAL/i.test(normaliser(texteNom))) {
        cible = 'total'
        textes.set('total', parColonne)
        continue
      }

      const numero = nomMots[0] && ENTIER.test(nomMots[0].texte) ? Number(nomMots[0].texte) : null

      // Chiffres renvoyés à la ligne (case trop étroite) : on les recolle
      // au montant juste au-dessus. « 14000 » + « 0 » = 140000.
      if (numero === null && !texteNom && classeMots.length === 0 && droite.length > 0 && cible
          && droite.every((m) => ENTIER.test(m.texte))) {
        const t = textes.get(cible)!
        for (const [c, ts] of parColonne) {
          const existants = t.get(c)
          if (existants?.length) existants[existants.length - 1] += ts.join('')
          else t.set(c, ts)
        }
        continue
      }
      if (cible === 'total') continue // rien d'autre après le total

      if (numero === null && droite.length === 0) {
        // Suite de la ligne précédente (nom ou classe trop longs).
        if (cible) {
          if (texteNom) cible.nom = `${cible.nom} ${texteNom}`.trim()
          if (classeMots.length) cible.classe = `${cible.classe} ${classeMots.map((m) => m.texte).join(' ')}`.trim()
        }
        continue
      }

      const fraisTexte = fraisMots.filter((m) => ENTIER.test(m.texte))
      const moisTexte = fraisMots.filter((m) => !ENTIER.test(m.texte)).map((m) => m.texte).join(' ')
      const eleve: LigneEleve = {
        numero,
        nom: (numero !== null ? nomMots.slice(1) : nomMots).map((m) => m.texte).join(' '),
        classe: classeMots.map((m) => m.texte).join(' '),
        frais: fraisTexte.length ? Number(fraisTexte[0].texte) : null,
        moisInscription: moisTexte || null,
        montants: celluleVide(),
        page,
      }
      textes.set(eleve, parColonne)
      cible = eleve
      eleves.push(eleve)
    }
  }

  // Montants définitifs, une fois les chiffres renvoyés à la ligne recollés.
  for (const e of eleves) {
    for (const [c, ts] of textes.get(e) ?? []) e.montants[c] = cellule(ts)
    if (!e.nom) anomalies.push({ type: 'ligne_illisible', message: `Page ${e.page} : ligne sans nom d’élève.` })
  }
  const textesTotal = textes.get('total')
  if (textesTotal) {
    totalImprime = {}
    for (const c of COLONNES) {
      const cel = cellule(textesTotal.get(c) ?? [])
      if (cel.valeur !== null) totalImprime[c] = cel.valeur
    }
  }

  for (const e of eleves) {
    for (const c of COLONNES) {
      const cel = e.montants[c]
      if (cel.brut !== null) {
        anomalies.push({
          type: 'texte_dans_montant',
          message: `${e.nom} : « ${cel.brut} » au lieu d’un montant (${LIBELLES_COLONNES[c]}).`,
          eleve: e.nom,
          colonne: c,
        })
      }
    }
  }

  const totalCalcule = Object.fromEntries(
    COLONNES.map((c) => [c, eleves.reduce((s, e) => s + (e.montants[c].valeur ?? 0), 0)]),
  ) as Record<Colonne, number>

  if (!totalImprime) {
    anomalies.push({ type: 'pas_de_total', message: 'Pas de ligne TOTAL GENERAL : contrôle impossible.' })
  } else {
    for (const c of COLONNES) {
      const imprime = totalImprime[c]
      if (imprime !== undefined && imprime !== totalCalcule[c]) {
        anomalies.push({
          type: 'total_faux',
          message: `${LIBELLES_COLONNES[c]} : total imprimé ${imprime}, somme des élèves ${totalCalcule[c]}.`,
          colonne: c,
        })
      }
    }
  }

  const frequences = new Map<string, number>()
  for (const e of eleves) frequences.set(e.classe, (frequences.get(e.classe) ?? 0) + 1)
  const classes = [...frequences].sort((a, b) => b[1] - a[1])
  if (classes.length > 1) {
    anomalies.push({
      type: 'classe_multiple',
      message: `Plusieurs classes dans le même fichier : ${classes.map(([c, n]) => `${c || '(vide)'} (${n})`).join(', ')}.`,
    })
  }

  return {
    fichier,
    etablissement,
    classe: classes[0]?.[0] ?? '',
    eleves,
    totalImprime,
    totalCalcule,
    anomalies,
  }
}

/** Lit un PDF « Tableau de bord ». */
export async function lireTableauDeBord(fichier: string, contenu: Uint8Array): Promise<TableauDeBord> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const tache = pdfjs.getDocument({ data: contenu, useSystemFonts: false, verbosity: 0 })
  const doc = await tache.promise
  try {
    const mots: Mot[] = []
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p)
      const { items } = await page.getTextContent()
      for (const it of items) {
        if (!('str' in it) || !it.str.trim()) continue
        mots.push(...decouper(it.str, it.transform[4], it.width, it.transform[5], p))
      }
    }
    return analyserMots(fichier, mots)
  } finally {
    await tache.destroy()
  }
}

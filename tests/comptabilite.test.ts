import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'

import { analyser } from '@/lib/comptabilite/analyse'
import { cleClasse } from '@/lib/comptabilite/classes'
import { COLONNES, type Colonne } from '@/lib/comptabilite/colonnes'
import { lireRestantDu } from '@/lib/comptabilite/excel-restant-du'
import { analyserMots, decouper, type Mot, type TableauDeBord } from '@/lib/comptabilite/pdf-tableau-de-bord'

// Données INVENTÉES : les vrais fichiers (noms d'élèves) ne vont jamais dans Git.

/** Reproduit la mise en page des PDF « Tableau de bord » (positions réelles). */
const X: Record<string, number> = {
  'N°': 35, NOM: 63, CLASSE: 172, FRAIS: 219, MOIS: 254, SPBR: 313, OCTB: 355, NVBR: 389, DCBR: 417, JANV: 453, FVR: 488,
  MARS: 520, AVR: 554, MAI: 586, JUIN: 621, '1TRANCH': 655, '2TRANCH': 693, '3TRANCH': 731, BULLETIN: 769,
}
const mot = (texte: string, x: number, y: number, page = 1): Mot[] => decouper(texte, x, texte.length * 4.2, y, page)
/** Un montant aligné à droite juste avant la colonne suivante. */
function montantEn(col: Colonne, v: string, y: number, page = 1): Mot[] {
  const i = COLONNES.indexOf(col)
  const fin = i + 1 < COLONNES.length ? X[COLONNES[i + 1]] - 4 : X.BULLETIN + 35
  return mot(v, fin - v.length * 4.2, y, page)
}
const entete = (y: number) => [
  ...mot('N°', X['N°'], y), ...mot('NOM POSTNOM PRENOM', X.NOM, y), ...mot('CLASSE', X.CLASSE, y), ...mot('FRAIS', X.FRAIS, y),
  ...mot('Mois Inscrption', X.MOIS, y), ...COLONNES.flatMap((c) => mot(c, X[c], y)),
]
function ligne(y: number, n: number | null, nom: string, classe: string, valeurs: Partial<Record<Colonne, string>>, page = 1) {
  return [
    ...(n !== null ? mot(`${n} ${nom}`, 55, y, page) : mot(nom, 63, y, page)),
    ...mot(classe, X.CLASSE, y, page), ...mot('140000 septembre', 226, y, page),
    ...COLONNES.flatMap((c) => montantEn(c, valeurs[c] ?? '0', y, page)),
  ]
}

describe('lecture des PDF « Tableau de bord »', () => {
  const mots = [
    ...mot("CS GRACE A L'OUEST", 366, 543), ...mot('TABLEAU DE BORD', 353, 515), ...entete(478),
    ...ligne(461, 1, 'ALPHA BETA', '1 ERE CG', { SPBR: '70000', '1TRANCH': '22500' }),
    ...ligne(444, 2, 'GAMMA DELTA', '1 ERE CG', { OCTB: '78000' }),
    // Nom et classe fusionnés dans un seul bloc de texte.
    ...decouper('3 EPSILON ZETA THETA IOTA BONUS 1 ERE', 51, 136, 427, 1), ...mot('140000 août', 226, 427),
    ...COLONNES.flatMap((c) => montantEn(c, '0', 427)),
    ...mot('CG', X.CLASSE, 416), // suite de la classe, ligne suivante
    // Page 2 : pas d'en-tête de colonnes, même mise en page.
    ...mot('TABLEAU DE BORD', 353, 515, 2),
    ...ligne(488, 4, 'ETA THETA', '1 ERE', { NVBR: '70000' }, 2), ...mot('CG', X.CLASSE, 477, 2),
    // Total imprimé, dont le dernier chiffre de novembre est passé à la ligne.
    ...mot('TOTAL GENERAL', 63, 450, 2), ...montantEn('SPBR', '70000', 450, 2), ...montantEn('OCTB', '78000', 450, 2),
    ...montantEn('NVBR', '7000', 450, 2), ...mot('0', X.NVBR + 22, 440, 2), ...montantEn('1TRANCH', '22500', 450, 2),
  ]
  const t = analyserMots('essai.pdf', mots)

  it('lit chaque élève, sur toutes les pages, et range chaque montant dans sa colonne', () => {
    expect(t.etablissement).toBe("CS GRACE A L'OUEST")
    expect(t.eleves.map((e) => e.nom)).toEqual(['ALPHA BETA', 'GAMMA DELTA', 'EPSILON ZETA THETA IOTA BONUS', 'ETA THETA'])
    expect(t.eleves[0].montants.SPBR.valeur).toBe(70000)
    expect(t.eleves[0].montants['1TRANCH'].valeur).toBe(22500)
    expect(t.eleves[1].montants.OCTB.valeur).toBe(78000)
    expect(t.eleves[1].montants.SPBR.valeur).toBe(0)
    expect(t.eleves[3].montants.NVBR.valeur).toBe(70000)
  })

  it('sépare le nom de la classe et recolle une classe écrite sur deux lignes', () => {
    expect(t.eleves[2].classe).toBe('1 ERE CG')
    expect(t.eleves[3].classe).toBe('1 ERE CG')
    expect(t.eleves[0].frais).toBe(140000)
    expect(t.eleves[0].moisInscription).toBe('septembre')
  })

  it('recolle les chiffres renvoyés à la ligne et vérifie le total imprimé', () => {
    expect(t.totalImprime?.NVBR).toBe(70000)
    expect(t.anomalies).toEqual([])
  })

  it('signale un total imprimé faux et du texte à la place d’un montant', () => {
    const faux = analyserMots('faux.pdf', [
      ...entete(478),
      ...ligne(461, 1, 'ALPHA BETA', '1 ERE CG', { SPBR: '2OOO' }),
      ...mot('TOTAL GENERAL', 63, 440), ...montantEn('SPBR', '5000', 440),
    ])
    expect(faux.anomalies.map((a) => a.type).sort()).toEqual(['texte_dans_montant', 'total_faux'])
  })
})

describe('lecture de l’Excel « Restant dû »', () => {
  it('lit les feuilles de détail (plusieurs classes par feuille) et les synthèses', async () => {
    const classeur = new ExcelJS.Workbook()
    const f = classeur.addWorksheet('1 TOUTES')
    const tete = ['N°', 'NOM POSTNOM  PRENOM', 'CLASSE', 'FRAIS', 'Mois Inscrption', ...COLONNES.slice(0, 10), 'TOTAL', '1TRANCH', '2TRANCH', '3TRANCH', 'TOTAL', 'BULLETIN']
    const eleve = (n: number, nom: string, classe: string, spbr: number | string) =>
      [n, nom, classe, 140000, 'septembre', spbr, 70000, 0, 0, 0, 0, 0, 0, 0, 0, { formula: 'F2+G2' }, 9000, 9000, 9000, null, 2500]
    f.addRow(['RESTANT DU 2026 2027 ESSAI'])
    f.addRow(tete)
    f.addRow(eleve(1, 'ALPHA BETA', '1 ERE CG', 70000))
    f.addRow(eleve(2, 'GAMMA DELTA', '1 ERE CG', 'a revoir'))
    f.addRow([null, 'TOTAL GENERAL', 'TOTAL GENERAL', null, null, 99000])
    f.addRow(tete)
    f.addRow(eleve(1, 'ETA THETA', '2EME CG', 0))
    f.addRow([null, 'TOTAL GENERAL', null, null, null, 0])
    const s = classeur.addWorksheet('RDA')
    s.addRow(['CLASSE', 'EFFECTIF', 'SEPTEMBRE', 'OCTOBRE', 'NVBR', 'DCBR', 'JANV', 'FEV', 'MARS', 'AV RIL', 'MAI', 'JUIN', 'TOT MIN', '1 ERE TRANCHE'])
    s.addRow(['1CG', 2, 70000, 140000])
    const r = await lireRestantDu('essai.xlsx', await classeur.xlsx.writeBuffer() as ArrayBuffer)

    expect(r.titre).toBe('RESTANT DU 2026 2027 ESSAI')
    expect(r.sections.map((x) => [x.classe, x.eleves.length])).toEqual([['1 ERE CG', 2], ['2EME CG', 1]])
    expect(r.sections[0].eleves[0].montants.OCTB.valeur).toBe(70000)
    expect(r.syntheses[0].lignes[0]).toMatchObject({ classe: '1CG', effectif: 2, montants: { SPBR: 70000, OCTB: 140000 } })
    const types = r.anomalies.map((a) => a.type).sort()
    expect(types).toContain('texte_dans_montant') // « a revoir »
    expect(types).toContain('total_faux') // 99 000 écrits, 70 000 en réalité
  })
})

describe('classes écrites de plusieurs façons', () => {
  it('ramène chaque variante à la même classe', () => {
    for (const [libelles, cle] of [
      [['1 MAT', '1 MATERNELLE', '1 MATERNLLE'], '1-MAT'],
      [['1ER M G', '1ERE M G', '1 ERE MECANIQUE GEN.', '1 M G'], '1-MG'],
      [['2E ELEC', '2EME ELECTRICITE', '2 ELEC'], '2-ELEC'],
      [['4E T C C', '4EME TCC', '4 COUPE ET COUTURE'], '4-TCC'],
      [['1CG', '1 ERE CG'], '1-CG'],
      [['8', '8EME EB', '8 EDUCATION DE BASE'], '8-EB'],
    ] as const) {
      for (const l of libelles) expect(cleClasse(l), l).toBe(cle)
    }
  })
})

describe('analyse : rapprochement payé / restant dû', () => {
  const montants = (v: Partial<Record<Colonne, number>>) =>
    Object.fromEntries(COLONNES.map((c) => [c, { valeur: v[c] ?? 0, brut: null }])) as Record<Colonne, { valeur: number; brut: null }>
  const pdf: TableauDeBord = {
    fichier: '1 CG.pdf', etablissement: 'ESSAI', classe: '1 ERE CG', totalImprime: null, anomalies: [],
    totalCalcule: Object.fromEntries(COLONNES.map((c) => [c, 0])) as Record<Colonne, number>,
    eleves: [
      { numero: 1, nom: 'ALPHA BETA', classe: '1 ERE CG', frais: 0, moisInscription: 'septembre', page: 1, montants: montants({ SPBR: 70000, OCTB: 70000 }) },
      { numero: 2, nom: 'GAMMA DELTA', classe: '1 ERE CG', frais: 0, moisInscription: 'octobre', page: 1, montants: montants({ SPBR: 70000 }) },
      { numero: 3, nom: 'KAPPA LAMBDA MU', classe: '1 ERE CG', frais: 0, moisInscription: 'septembre', page: 1, montants: montants({}) },
      { numero: 4, nom: 'SIGMA PR PAPA', classe: '1 ERE CG', frais: 0, moisInscription: 'septembre', page: 1, montants: montants({}) },
    ],
  }
  const ligneRestant = (nom: string, v: Partial<Record<Colonne, number>>, mois = 'septembre') =>
    ({ numero: null, nom, classe: '1 ERE CG', frais: null, moisInscription: mois, feuille: 'F', ligne: 1, montants: montants(v) })
  const restant = {
    fichier: 'restant.xlsx', titre: null, syntheses: [], anomalies: [],
    sections: [{
      feuille: 'F', classe: '1 ERE CG', totalImprime: null, totalCalcule: {} as Record<Colonne, number>,
      eleves: [
        ligneRestant('ALPHA BETA', { NVBR: 70000 }),
        ligneRestant('GAMMA DELTA', { SPBR: 70000, OCTB: 70000 }, 'octobre'), // septembre payé ET encore dû
        ligneRestant('KAPPA LAMBDA', { SPBR: 70000, OCTB: 70000 }), // nom raccourci
        ligneRestant('SIGMA PR PAPA', {}),
        ligneRestant('OMEGA SEUL', { SPBR: 70000 }),
      ],
    }],
  }
  const r = analyser({ tableaux: [pdf], restant, periode: 'OCTB' })

  it('rapproche les élèves, même au nom raccourci, et classe chacun', () => {
    const statut = Object.fromEntries(r.eleves.map((e) => [e.nom, e.statut]))
    expect(statut).toEqual({
      'ALPHA BETA': 'en_ordre', // novembre pas encore échu à fin octobre
      'GAMMA DELTA': 'non_en_ordre',
      'KAPPA LAMBDA MU': 'non_en_ordre',
      'OMEGA SEUL': 'non_en_ordre',
      'SIGMA PR PAPA': 'pris_en_charge',
    })
  })

  it('calcule le recouvrement sur les élèves présents dans les deux fichiers', () => {
    // Payé 210 000 ; dû 210 000 + 280 000 (Gamma 140 000, Kappa 140 000).
    expect(r.total.payePeriode).toBe(210000)
    expect(r.total.taux).toBe(42.9)
    expect(r.total.baseTaux).toBe(4)
  })

  it('relève les incohérences', () => {
    const cats = new Set(r.anomalies.map((a) => a.categorie))
    expect(cats).toEqual(new Set(['double_compte', 'nom_different', 'absent_pdf', 'inscription_tardive']))
  })
})

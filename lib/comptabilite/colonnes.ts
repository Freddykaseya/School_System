/** Colonnes de montants des fichiers de l'école (PDF et Excel). */
export const COLONNES_MOIS = ['SPBR', 'OCTB', 'NVBR', 'DCBR', 'JANV', 'FVR', 'MARS', 'AVR', 'MAI', 'JUIN'] as const
export const COLONNES_AUTRES = ['1TRANCH', '2TRANCH', '3TRANCH', 'BULLETIN'] as const
export const COLONNES = [...COLONNES_MOIS, ...COLONNES_AUTRES] as const
export type Colonne = (typeof COLONNES)[number]

export const LIBELLES_COLONNES: Record<Colonne, string> = {
  SPBR: 'Septembre', OCTB: 'Octobre', NVBR: 'Novembre', DCBR: 'Décembre', JANV: 'Janvier', FVR: 'Février',
  MARS: 'Mars', AVR: 'Avril', MAI: 'Mai', JUIN: 'Juin', '1TRANCH': 'Tranche 1', '2TRANCH': 'Tranche 2',
  '3TRANCH': 'Tranche 3', BULLETIN: 'Bulletin',
}

/** Montant lu : un nombre, ou le texte trouvé à la place (« 2OOO », « a revoir »). */
export type Cellule = { valeur: number | null; brut: string | null }

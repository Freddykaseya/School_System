import type { Cycle, Devise, Role } from '@/lib/types'

/**
 * Tous les textes affichés passent par ici : une traduction (anglais par
 * exemple) se fera en ajoutant une seconde table, sans toucher aux pages.
 */
export const CYCLES: Record<Cycle, string> = {
  MATERNELLE: 'Maternelle',
  PRIMAIRE: 'Primaire',
  EDUCATION_BASE: 'Éducation de base',
  HUMANITES: 'Humanités',
}

export const ORDRE_CYCLES: Cycle[] = ['MATERNELLE', 'PRIMAIRE', 'EDUCATION_BASE', 'HUMANITES']

export const ROLES: Record<Role, string> = {
  ADMIN: 'Administrateur',
  DIRECTION: 'Direction',
  COMPTABLE: 'Comptable',
  CAISSIER: 'Caissier',
}

const FORMATS: Record<Devise, Intl.NumberFormat> = {
  CDF: new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }),
  USD: new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
}

/** 70000 → « 70 000 FC » ; 25 → « 25,00 $ ». */
export function montant(valeur: number, devise: Devise = 'CDF'): string {
  const texte = FORMATS[devise].format(valeur).replace(/ | /g, ' ')
  return devise === 'CDF' ? `${texte} FC` : `${texte} $`
}

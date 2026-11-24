/*
 * Les fichiers écrivent la même classe de plusieurs façons : « 1 MAT »,
 * « 1 MATERNELLE », « 3 MATERNLLE » ; « 1ER M G », « 1 ERE MECANIQUE GEN. ».
 * On les ramène à une clé commune, « 1-MAT », « 1-MG », pour rapprocher
 * les fichiers entre eux.
 */

export const normaliser = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

// Ordre important : les plus longues d'abord.
const SECTIONS: [RegExp, string][] = [
  [/\bMATERN\w*|\bMAT\b/, 'MAT'],
  [/\bPRIM\w*/, 'PRIM'],
  [/\bE ?B\b|EDUCATION DE BASE/, 'EB'],
  [/\bH ?P\b|PEDAGO\w*/, 'HP'],
  [/\bC ?G\b|COMMERC\w*/, 'CG'],
  [/MECANIQUE AUTO\w*|\bM ?A\b/, 'MA'],
  [/MECANIQUE GEN\w*|\bM ?G\b/, 'MG'],
  [/\bSC\w*/, 'SC'],
  [/COUPE|COUTURE|\bT ?C ?C\b/, 'TCC'],
  [/\bELEC\w*/, 'ELEC'],
]

/** Clé de classe (« 1-MAT », « 2-ELEC »), ou null si on ne la reconnaît pas. */
export function cleClasse(libelle: string): string | null {
  const t = normaliser(libelle)
  const niveau = t.match(/^(\d)/)?.[1]
  if (!niveau) return null
  // « 1ERE CG », « 1CG », « 1 ERE CG » : on retire le niveau et son ordinal.
  const reste = ` ${t.replace(/^\d+/, '').replace(/^\s*(ERE|EME|ER|E)\b/, '')} `
  for (const [motif, code] of SECTIONS) if (motif.test(reste)) return `${niveau}-${code}`
  // 7e et 8e : éducation de base, même sans le préciser (« 8 »).
  if (niveau === '7' || niveau === '8') return `${niveau}-EB`
  return null
}

const ORDRE_SECTIONS = ['MAT', 'PRIM', 'EB', 'HP', 'CG', 'MA', 'MG', 'SC', 'TCC', 'ELEC']

/** Tri naturel des classes : maternelle, primaire, EB, puis options. */
export function comparerCles(a: string, b: string): number {
  const [na, sa] = a.split('-')
  const [nb, sb] = b.split('-')
  const ia = ORDRE_SECTIONS.indexOf(sa)
  const ib = ORDRE_SECTIONS.indexOf(sb)
  const ga = ia <= 2 ? 0 : 1
  const gb = ib <= 2 ? 0 : 1
  if (ga !== gb) return ga - gb
  if (ga === 0) return ia - ib || Number(na) - Number(nb)
  return Number(na) - Number(nb) || ia - ib
}

/** Libellé lisible d'une clé : « 1-MAT » → « 1re maternelle ». */
export function libelleCle(cle: string): string {
  const [n, s] = cle.split('-')
  const rang = n === '1' ? `${n}re` : `${n}e`
  const noms: Record<string, string> = {
    MAT: 'maternelle', PRIM: 'primaire', EB: 'éducation de base', HP: 'HP', CG: 'CG', MA: 'mécanique auto',
    MG: 'mécanique générale', SC: 'scientifique', TCC: 'coupe et couture', ELEC: 'électricité',
  }
  return `${rang} ${noms[s] ?? s}`
}

/** Nom d'élève comparable d'un fichier à l'autre. */
export const cleNom = (nom: string) => normaliser(nom)

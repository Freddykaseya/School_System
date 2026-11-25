import type { FraisClasse, MoisScolaire } from '@/lib/frais/service'
import { totalAnnuel } from '@/lib/frais/service'
import { montant } from '@/lib/libelles'
import type { Devise } from '@/lib/types'

/** « sept. → mai (9 mois) », ou la liste si les mois ne se suivent pas. */
export function libelleMois(cles: string[], mois: MoisScolaire[]): string {
  const idx = cles.map((c) => mois.findIndex((m) => m.cle === c)).filter((i) => i >= 0).sort((a, b) => a - b)
  if (idx.length === 0) return '—'
  const suivis = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1)
  if (suivis && idx.length > 2) return `${mois[idx[0]].court} → ${mois[idx.at(-1)!].court} (${idx.length} mois)`
  return idx.map((i) => mois[i].court).join(', ')
}

export function libelleTotal(f: FraisClasse): string {
  const t = totalAnnuel(f)
  return (Object.entries(t) as [Devise, number][]).map(([d, v]) => montant(v, d)).join(' + ') || '—'
}

/** Ligne de frais ponctuels : « 3 × 9 000 FC » si identiques, sinon la liste. */
export function libelleLignes(lignes: { libelle: string; montant: number; devise: Devise }[], avecNom = false): string {
  if (lignes.length === 0) return '—'
  const identiques = lignes.every((l) => l.montant === lignes[0].montant && l.devise === lignes[0].devise)
  if (identiques && !avecNom) return `${lignes.length} × ${montant(lignes[0].montant, lignes[0].devise)}`
  return lignes.map((l) => (avecNom ? `${l.libelle} ${montant(l.montant, l.devise)}` : montant(l.montant, l.devise))).join(' · ')
}

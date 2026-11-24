/** Taux de recouvrement en % (payé / dû), ou null s'il n'y a rien de dû. */
export function tauxRecouvrement(paye: number, du: number): number | null {
  if (du <= 0) return null
  return Math.round((paye / du) * 1000) / 10
}

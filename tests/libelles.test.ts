import { describe, expect, it } from 'vitest'

import { tauxRecouvrement } from '@/lib/calculs'
import { montant } from '@/lib/libelles'

describe('montant', () => {
  it('affiche les francs congolais sans décimales', () => {
    expect(montant(70000)).toBe('70 000 FC')
    expect(montant(443740000, 'CDF')).toBe('443 740 000 FC')
  })
  it('affiche les dollars avec deux décimales', () => {
    expect(montant(25, 'USD')).toBe('25,00 $')
  })
})

describe('tauxRecouvrement', () => {
  it('reprend le taux de septembre-octobre de CSGO2 (48,5 %)', () => {
    expect(tauxRecouvrement(41226000, 84972000)).toBe(48.5)
  })
  it('ne divise pas par zéro', () => {
    expect(tauxRecouvrement(0, 0)).toBeNull()
  })
})

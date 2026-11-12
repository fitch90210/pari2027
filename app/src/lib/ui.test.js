import { describe, it, expect } from 'vitest'
import { initiales, teinteAvatar, joursAvant } from './ui'

describe('aides d\'affichage', () => {
  it('initiales', () => {
    expect(initiales('Camille')).toBe('C')
    expect(initiales('Jean-Luc Mélenchon')).toBe('JM')
    expect(initiales('  édouard   philippe ')).toBe('ÉP')
    expect(initiales('')).toBe('?')
  })
  it('teinte stable entre 1 et 4', () => {
    expect(teinteAvatar('Camille')).toBe(teinteAvatar('Camille'))
    for (const n of ['A', 'Hugo', 'Léa', 'Mehdi', 'Sarah']) {
      const t = teinteAvatar(n)
      expect(t).toBeGreaterThanOrEqual(1)
      expect(t).toBeLessThanOrEqual(4)
    }
  })
  it('jours restants, arrondis au jour supérieur, jamais négatifs', () => {
    const now = new Date('2026-11-12T10:00:00Z')
    expect(joursAvant('2026-11-13T10:00:00Z', now)).toBe(1)
    expect(joursAvant('2026-11-13T11:00:00Z', now)).toBe(2)
    expect(joursAvant('2026-11-01T00:00:00Z', now)).toBe(0)
  })
})

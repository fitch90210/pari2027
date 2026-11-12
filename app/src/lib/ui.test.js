import { describe, it, expect } from 'vitest'
import { initiales, teinteAvatar, joursAvant, prochaineBaisse, depuis, jourDuScrutin } from './ui'

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

describe('prochaine baisse du bonus', () => {
  const periodes = [{ id: 3, ends_at: '2027-04-10T22:00:00Z' }]
  it('renvoie un jour où le bonus a baissé d\'un point', () => {
    const now = new Date('2026-11-12T10:00:00Z')
    const d = prochaineBaisse(periodes, now)
    expect(d.getTime()).toBeGreaterThan(now.getTime())
    expect(d.toISOString().slice(0, 10)).toBe('2026-12-11')
  })
  it('null une fois le bonus épuisé', () => {
    expect(prochaineBaisse(periodes, new Date('2027-04-12T00:00:00Z'))).toBeNull()
  })
})

describe('âge d\'un pari et jour du scrutin', () => {
  const now = new Date('2026-11-12T10:00:00Z')
  it('depuis', () => {
    expect(depuis('2026-11-12T09:59:40Z', now)).toBe('À l\'instant')
    expect(depuis('2026-11-12T09:15:00Z', now)).toBe('45 min')
    expect(depuis('2026-11-12T07:00:00Z', now)).toBe('3 h')
    expect(depuis('2026-11-11T08:00:00Z', now)).toBe('Hier')
    expect(depuis('2026-10-28T08:00:00Z', now)).toMatch(/28/)
  })
  it('jour du scrutin = lendemain de la fin de période 3, heure de Paris', () => {
    expect(jourDuScrutin([{ id: 3, ends_at: '2027-04-10T22:00:00Z' }])).toBe('11 avril')
    expect(jourDuScrutin([])).toBeNull()
  })
})

import { describe, it, expect } from 'vitest'
import { dateDemoPari, jouerDemo, DEMO_ID } from './demo'

const ALL = ['m1', 'm2', 'm3', 'm4', 'm5']
const periodes = [
  { id: 1, scored: ALL, ends_at: '2026-08-31T22:00:00Z' },
  { id: 2, scored: ALL, ends_at: '2027-03-14T23:00:00Z' },
  { id: 3, scored: ['m2', 'm3', 'm4', 'm5'], ends_at: '2027-04-10T22:00:00Z' },
  { id: 4, scored: ['m4', 'm5'], ends_at: '2027-04-24T22:00:00Z' },
]
const results = { candidates: ['A', 'B', 'C', 'D'], scores: { A: 31, B: 27.5, C: 24, D: 17.5 }, finalists: ['A', 'C'], winner: 'A', winnerScore: 53.5 }
const vrai = { id: 1, player_id: 'x', periode: 1, created_at: '2026-04-23T10:00:00Z', m1: ['A', 'B', 'C', 'D'], m2: { A: 30, B: 25, C: 25, D: 20 }, m3: ['A', 'B'], m4: 'A', m5: 52 }

describe('mode démo', () => {
  it('date du pari : début de la période choisie', () => {
    expect(dateDemoPari(2, periodes, [vrai])).toBe('2026-08-31T22:01:00.000Z')
    expect(dateDemoPari(4, periodes, [vrai])).toBe('2027-04-10T22:01:00.000Z')
    expect(dateDemoPari(1, periodes, [vrai])).toBe('2026-04-23T10:00:00.000Z')
  })

  it('un pari parfait en période 1 se classe premier, bonus compris, sans toucher aux vrais paris', () => {
    const parfait = { m1: ['A', 'B', 'C', 'D'], m2: { A: 31, B: 27.5, C: 24, D: 17.5 }, m3: ['A', 'C'], m4: 'A', m5: 53.5 }
    const paris = [vrai]
    const r = jouerDemo(parfait, periodes[0], periodes, paris, results)
    expect(r.rang).toBe(1)
    expect(r.sur).toBe(2)
    expect(r.scores.total).toBeGreaterThan(r.scores.bareme)
    expect(r.pari.player_id).toBe(DEMO_ID)
    expect(paris).toHaveLength(1)
  })

  it('plus la période est tardive, moins le bonus est élevé', () => {
    const v = { m1: [], m2: {}, m3: [], m4: 'A', m5: 53.5 }
    const b = id => jouerDemo(v, periodes[id - 1], periodes, [vrai], results).scores.bonus
    expect(b(1)).toBeGreaterThan(b(2))
    expect(b(2)).toBeGreaterThanOrEqual(b(3))
    expect(b(4)).toBe(0)
  })
})

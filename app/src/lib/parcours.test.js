import { describe, it, expect } from 'vitest'
import { etapesOuvertes, candidatsDuPari, totalScores, totalOk, repartirEgalement, finalistesProbables, pourcent } from './parcours'

const ALL = ['m1', 'm2', 'm3', 'm4', 'm5']

describe('parcours Parier', () => {
  it('étapes ouvertes selon la période, dans l\'ordre', () => {
    expect(etapesOuvertes({ scored: ALL })).toEqual(ALL)
    expect(etapesOuvertes({ scored: ['m5', 'm2', 'm3', 'm4'] })).toEqual(['m2', 'm3', 'm4', 'm5'])
    expect(etapesOuvertes({ scored: ['m4', 'm5'] })).toEqual(['m4', 'm5'])
    expect(etapesOuvertes(undefined)).toEqual([])
  })

  it('candidats : officiels dès la période 3, sinon ceux du pronostic 1', () => {
    const form = { m1: ['A', 'B'] }
    expect(candidatsDuPari(form, { id: 2 }, ['X', 'Y', 'Z'])).toEqual(['A', 'B'])
    expect(candidatsDuPari(form, { id: 3 }, ['X', 'Y', 'Z'])).toEqual(['X', 'Y', 'Z'])
  })

  it('total des scores et tolérance', () => {
    const form = { m2: { A: '30', B: '25.5', C: '' } }
    expect(totalScores(form, ['A', 'B', 'C'])).toBeCloseTo(55.5)
    expect(totalOk(100)).toBe(true)
    expect(totalOk(99.9)).toBe(true)
    expect(totalOk(99.8)).toBe(false)
  })

  it('répartition égale : somme exacte à 100 par demi-points', () => {
    for (const n of [1, 2, 3, 4, 7, 9, 12]) {
      const cands = Array.from({ length: n }, (_, i) => 'C' + i)
      const r = repartirEgalement(cands)
      const somme = Object.values(r).reduce((s, v) => s + parseFloat(v), 0)
      expect(somme).toBe(100)
      expect(Object.keys(r)).toEqual(cands)
    }
    expect(repartirEgalement([])).toEqual({})
    expect(repartirEgalement(['A', 'B', 'C'])).toEqual({ A: '33.5', B: '33.5', C: '33' })
  })

  it('finalistes probables : les deux plus hauts scores', () => {
    expect(finalistesProbables(['A', 'B', 'C'], { A: '20', B: '31', C: '24' })).toEqual(['B', 'C'])
    expect(finalistesProbables(['A', 'B'], { A: '50' })).toBeNull()
    expect(finalistesProbables(['A', 'B'], { A: '50', B: '0' })).toBeNull()
  })

  it('pourcentage à la française', () => {
    expect(pourcent(32)).toBe('32 %')
    expect(pourcent('32.5')).toBe('32,5 %')
  })
})

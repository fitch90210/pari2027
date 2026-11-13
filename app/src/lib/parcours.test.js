import { describe, it, expect } from 'vitest'
import {
  totalScores, totalOk, trierParPopularite, repartirEgalement, finalistesProbables, premierTourPret, scoreVainqueurOk, valeursPourEnvoi, pourcent,
} from './parcours'

describe('parcours Pronostiquer', () => {
  it('total des scores et tolérance', () => {
    const form = { m1: ['A', 'B', 'C'], m2: { A: '30', B: '25.5', C: '' } }
    expect(totalScores(form)).toBeCloseTo(55.5)
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

  it('finalistes : les deux plus hauts scores, le premier ajouté devant à égalité', () => {
    expect(finalistesProbables(['A', 'B', 'C'], { A: '20', B: '31', C: '24' })).toEqual(['B', 'C'])
    expect(finalistesProbables(['A', 'B', 'C'], { A: '25', B: '50', C: '25' })).toEqual(['B', 'A'])
    expect(finalistesProbables(['A', 'B'], { A: '50' })).toBeNull()
    expect(finalistesProbables(['A', 'B'], { A: '50', B: '0' })).toBeNull()
  })

  it('1er tour prêt : deux candidats crédités et total à 100 %', () => {
    expect(premierTourPret({ m1: ['A', 'B'], m2: { A: '60', B: '40' } })).toBe(true)
    expect(premierTourPret({ m1: ['A', 'B'], m2: { A: '60', B: '30' } })).toBe(false)
    expect(premierTourPret({ m1: ['A'], m2: { A: '100' } })).toBe(false)
  })

  it('score du vainqueur : plus de 50 %', () => {
    expect(scoreVainqueurOk('50')).toBe(false)
    expect(scoreVainqueurOk('50.5')).toBe(true)
    expect(scoreVainqueurOk('')).toBe(false)
  })

  it('valeurs envoyées : nombres, candidats sans score retirés, finalistes déduits', () => {
    const form = { m1: ['A', 'B', 'C', 'D'], m2: { A: '30', B: '45', C: '25', D: '' }, m4: 'B', m5: '53.5' }
    expect(valeursPourEnvoi(form)).toEqual({ m2: { A: 30, B: 45, C: 25 }, m3: ['B', 'A'], m4: 'B', m5: 53.5 })
  })

  it('pourcentage à la française', () => {
    expect(pourcent(32)).toBe('32\u00a0%')
    expect(pourcent('32.5')).toBe('32,5\u00a0%')
  })

  it('suggestions : les plus cités d\'abord, noms ajoutés à la main inclus', () => {
    const paris = [{ m1: ['B', 'X'] }, { m1: ['B', 'C', 'B'] }, { m1: ['C'] }, { m1: [] }]
    expect(trierParPopularite(['A', 'B', 'C', 'D'], paris))
      .toEqual([{ nom: 'B', n: 2 }, { nom: 'C', n: 2 }, { nom: 'X', n: 1 }, { nom: 'A', n: 0 }, { nom: 'D', n: 0 }])
  })
})

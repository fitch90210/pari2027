import { describe, it, expect } from 'vitest'
import { pseudoDe, clePseudo, parRecence, premierTour, secondTour, resumePronostic } from './pronostic'

describe('lecture d\'un pronostic', () => {
  it('pseudo', () => {
    expect(pseudoDe({ pseudo: ' Léa ' })).toBe('Léa')
    expect(pseudoDe({ pseudo: '' })).toBe('Anonyme')
    expect(clePseudo(' Léa ')).toBe(clePseudo('léa'))
  })

  it('du plus récent au plus ancien', () => {
    const l = [{ id: 1, created_at: '2026-05-01' }, { id: 3, created_at: '2026-06-01' }, { id: 2, created_at: '2026-05-01' }]
    expect(l.sort(parRecence).map(p => p.id)).toEqual([3, 2, 1])
  })

  it('1er tour trié, candidats sans score à la fin', () => {
    expect(premierTour({ m1: ['A', 'B', 'C', 'D'], m2: { A: 20, B: '45', C: 35 } }))
      .toEqual([{ nom: 'B', v: 45 }, { nom: 'C', v: 35 }, { nom: 'A', v: 20 }, { nom: 'D', v: null }])
    expect(premierTour({ m1: ['A', 'B'], m2: {} })).toEqual([{ nom: 'A', v: null }, { nom: 'B', v: null }])
  })

  it('2nd tour : vainqueur, vaincu et complément', () => {
    expect(secondTour({ m3: ['A', 'B'], m4: 'B', m5: 52.4 }))
      .toEqual({ vainqueur: 'B', vaincu: 'A', scoreVainqueur: 52.4, scoreVaincu: 47.6 })
    // Ancien pari inversé (vainqueur à moins de 50 %) : c'est l'autre finaliste qui gagne
    expect(secondTour({ m3: ['A', 'B'], m4: 'A', m5: '32.9' }))
      .toEqual({ vainqueur: 'B', vaincu: 'A', scoreVainqueur: 67.1, scoreVaincu: 32.9 })
    expect(secondTour({ m3: ['A', 'B'], m4: 'A', m5: 50 })).toMatchObject({ vainqueur: 'A', scoreVainqueur: 50 })
    expect(secondTour({ m3: ['A', 'B'], m4: 'A', m5: null })).toMatchObject({ scoreVainqueur: null, scoreVaincu: null })
    expect(secondTour({ m3: [], m4: '', m5: null })).toBeNull()
    expect(secondTour({ m3: ['A', 'B'], m4: 'C', m5: 55 })).toBeNull()
  })

  it('résumé sur une ligne', () => {
    expect(resumePronostic({ m3: ['A', 'B'], m4: 'B', m5: 52.5 })).toBe('B gagne avec 52,5 %')
    expect(resumePronostic({ m1: ['A', 'B', 'C', 'D'], m2: {} })).toBe('1er tour : A, B, C')
  })
})

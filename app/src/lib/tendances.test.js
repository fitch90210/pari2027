import { describe, it, expect } from 'vitest'
import { derniersAvis, tendancesPremierTour, tendancesSecondTour, placerPoints } from './tendances'
import { secondTour } from './pronostic'

const p = (id, pseudo, created_at, o = {}) => ({ id, pseudo, created_at, m1: [], m2: {}, m3: [], m4: '', m5: null, ...o })

const paris = [
  p(1, 'Léa', '2026-05-01T10:00:00Z', { m2: { A: 30, B: 25, C: 45 }, m3: ['C', 'A'], m4: 'C', m5: 52 }),
  p(2, 'Hugo', '2026-05-02T10:00:00Z', { m2: { A: 34, C: 66 }, m3: ['C', 'A'], m4: 'A', m5: 55 }),
  p(3, 'Sam', '2026-05-03T10:00:00Z', { m1: ['A', 'B'] }), // ancien pari : candidats sans scores ni 2nd tour
  // Léa change d'avis : seul son dernier pronostic compte dans les tendances
  p(4, 'léa ', '2026-09-01T10:00:00Z', { m2: { B: 60, C: 40 }, m3: ['B', 'C'], m4: 'B', m5: 58 }),
]

describe('tendances', () => {
  it('un avis par pseudo, insensible à la casse : le plus récent', () => {
    const avis = derniersAvis(paris, secondTour)
    expect(avis.map(a => a.pari.id).sort()).toEqual([2, 4])
  })

  it('1er tour : par candidat, trié par poids, sans les pronostics dépourvus de scores', () => {
    const t = tendancesPremierTour(paris)
    expect(t.personnes).toBe(2)
    // C pèse 106 (66 + 40), B 60, A 34
    expect(t.candidats.map(c => c.nom)).toEqual(['C', 'B', 'A'])
    expect(t.candidats[0]).toMatchObject({ n: 2, min: 40, max: 66, moy: 53 })
    expect(t.candidats[0].valeurs.map(v => v.nom)).toEqual(['Hugo', 'léa'])
  })

  it('2nd tour : duels, vainqueurs et score du vainqueur', () => {
    const t = tendancesSecondTour(paris)
    expect(t.personnes).toBe(2)
    expect(t.duels.map(d => d.duo)).toEqual([['A', 'C'], ['B', 'C']])
    expect(t.vainqueurs.map(v => v.nom)).toEqual(['A', 'B'])
    expect(t.scoreVainqueur).toMatchObject({ n: 2, min: 55, max: 58, moy: 56.5 })
    expect(tendancesSecondTour([]).scoreVainqueur).toBeNull()
  })

  it('placement des points : valeurs voisines sur des couloirs différents', () => {
    const pts = placerPoints([{ v: 20 }, { v: 21 }, { v: 40 }], 40)
    expect(pts.map(x => x.couloir)).toEqual([0, 1, 0])
    expect(pts[2].x).toBe(100)
  })
})

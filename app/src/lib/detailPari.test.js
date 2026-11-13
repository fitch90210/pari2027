import { describe, it, expect } from 'vitest'
import { valeurTexte, detailPari } from './detailPari'
import { placerPoints } from './tendances'

const P1 = { id: 1, scored: ['m1', 'm2', 'm3', 'm4', 'm5'] }
const periodes = [{ ...P1, ends_at: '2026-08-31T22:00:00Z' }, { id: 3, scored: ['m2', 'm3', 'm4', 'm5'], ends_at: '2027-04-10T22:00:00Z' }]
const pari = { id: 1, player_id: 'x', periode: 1, created_at: '2026-11-12T10:00:00Z', m1: ['A', 'B'], m2: { A: '30', B: 25.5, C: 0 }, m3: ['A', 'B'], m4: 'A', m5: 52 }
const results = { candidates: ['A', 'B'], scores: { A: 31, B: 27 }, finalists: ['A', 'B'], winner: 'A', winnerScore: 53 }

describe('détail d\'un pari', () => {
  it('valeurs lisibles', () => {
    expect(valeurTexte('m1', pari)).toBe('A, B')
    expect(valeurTexte('m2', pari)).toBe('A 30 % · B 25,5 %')
    expect(valeurTexte('m3', pari)).toBe('A et B')
    expect(valeurTexte('m5', pari)).toBe('52 %')
    expect(valeurTexte('m4', { m4: '' })).toBeNull()
  })
  it('sans résultats : pas de points, mais le bonus acquis', () => {
    const d = detailPari(pari, periodes[0], null, periodes)
    expect(d.lignes.map(l => l.cle)).toEqual(['m12', 'm3', 'm45'])
    expect(d.total).toBeNull()
    expect(d.bonus).toBe(4)
  })
  it('avec résultats : points par pronostic et total = barème + bonus', () => {
    const d = detailPari(pari, periodes[0], results, periodes)
    expect(d.bareme).toBe(d.lignes.reduce((t, l) => t + l.points, 0))
    expect(d.total).toBe(d.bareme + 4)
  })
  it('seuls les pronostics ouverts de la période, regroupés', () => {
    expect(detailPari(pari, periodes[1], null, periodes).lignes.map(l => l.cle)).toEqual(['m2', 'm3', 'm45'])
  })

  it('candidats et scores en une seule ligne : du plus haut score au plus bas, sans score ensuite', () => {
    const d = detailPari({ ...pari, m1: ['A', 'B', 'D'], m2: { B: 25.5, A: 30 } }, periodes[0], null, periodes)
    expect(d.lignes[0].items).toEqual([{ nom: 'A', valeur: '30 %' }, { nom: 'B', valeur: '25,5 %' }, { nom: 'D', valeur: null }])
  })

  it('vainqueur et score en une seule ligne, points cumulés', () => {
    const d = detailPari(pari, periodes[0], results, periodes)
    const l = d.lignes.find(x => x.cle === 'm45')
    expect(l.valeur).toBe('A · 52 %')
    expect(l.points).toBe(8) // vainqueur (6) + score à 2 points près (2)
  })
})

describe('placement des points', () => {
  it('des valeurs voisines passent sur des couloirs différents', () => {
    const r = placerPoints([{ v: 20 }, { v: 20.5 }, { v: 21 }, { v: 30 }], 40)
    expect(r.map(p => p.couloir)).toEqual([0, 1, 2, 0])
    expect(r[0].x).toBe(50)
  })
})

import { describe, it, expect } from 'vitest'
import {
  scoreM1, scoreM2, scoreM3, scoreM4, scoreM5, scorePari, classementPeriode, bonusAnticipation, classementGeneral,
} from './scoring'
import { periodeCourante, isoVersParis, parisVersIso } from './periodes'
import { resultatsComplets } from './pari'

const ALL = ['m1', 'm2', 'm3', 'm4', 'm5']
const P1 = { id: 1, scored: ALL }
const P2 = { id: 2, scored: ALL }
const P3 = { id: 3, scored: ['m2', 'm3', 'm4', 'm5'] }
const P4 = { id: 4, scored: ['m4', 'm5'] }

const results = {
  candidates: ['A', 'B', 'C', 'D'],
  scores: { A: 31, B: 27.5, C: 24, D: 17.5 },
  finalists: ['A', 'C'],
  winner: 'A',
  winnerScore: 53.5,
}

const pari = {
  id: 1, player_id: 'x', periode: 1, created_at: '2026-05-01T10:00:00Z',
  m1: ['A', 'B', 'C', 'D'],
  m2: { A: 30, B: 25, C: 25, D: 20 },
  m3: ['A', 'B'],
  m4: 'A',
  m5: 52,
}

describe('barème par pronostic', () => {
  it('m1 : 2 pts par candidat correct, +3 si le bon nombre', () => {
    expect(scoreM1(['A', 'B', 'C', 'D'], results.candidates)).toBe(11)
    expect(scoreM1(['A', 'B', 'Z'], results.candidates)).toBe(4)
    expect(scoreM1(['A', 'B', 'C', 'Z'], results.candidates)).toBe(9)
    expect(scoreM1([], results.candidates)).toBe(0)
  })
  it('m1 ignore la casse et les espaces', () => {
    expect(scoreM1([' a ', 'b'], ['A', 'B'])).toBe(7)
  })
  it('m2 : 2 pts par score à ±2 points (bornes incluses)', () => {
    expect(scoreM2({ A: 33 }, { A: 31 }, ['A'])).toBe(2)
    expect(scoreM2({ A: 33.1 }, { A: 31 }, ['A'])).toBe(0)
    expect(scoreM2({ A: 29 }, { A: 31 }, ['A'])).toBe(2)
  })
  it('m3 : 8 pts pour les deux finalistes, 3 pour un seul', () => {
    expect(scoreM3(['A', 'C'], ['C', 'A'])).toBe(8)
    expect(scoreM3(['A', 'B'], ['A', 'C'])).toBe(3)
    expect(scoreM3(['B', 'D'], ['A', 'C'])).toBe(0)
  })
  it('m4 : 6 pts pour le vainqueur', () => {
    expect(scoreM4('a', 'A')).toBe(6)
    expect(scoreM4('B', 'A')).toBe(0)
    expect(scoreM4('', 'A')).toBe(0)
  })
  it('m5 : 2 pts à ±2 points', () => {
    expect(scoreM5(55.5, 53.5)).toBe(2)
    expect(scoreM5(55.6, 53.5)).toBe(0)
    expect(scoreM5(null, 53.5)).toBe(0)
  })
})

describe('scorePari', () => {
  it('période 1 : les cinq pronostics comptent', () => {
    expect(scorePari(pari, results, P1)).toEqual({ m1: 11, m2: 4, m3: 3, m4: 6, m5: 2, total: 26 })
  })
  it('période 2 : même barème, liste de référence du pari', () => {
    expect(scorePari(pari, results, P2).total).toBe(26)
  })
  it('période 3 : m1 ignoré, m2 jugé sur les vrais candidats', () => {
    const p = { ...pari, m1: [] }
    expect(scorePari(p, results, P3)).toEqual({ m1: 0, m2: 4, m3: 3, m4: 6, m5: 2, total: 15 })
    // même avec un m1 parfait : il ne rapporte rien en période 3
    expect(scorePari(pari, results, P3).m1).toBe(0)
  })
  it('période 4 : seuls m4 et m5 comptent', () => {
    expect(scorePari(pari, results, P4)).toEqual({ m1: 0, m2: 0, m3: 0, m4: 6, m5: 2, total: 8 })
  })
  it('sans résultats ou sans pari : zéro', () => {
    expect(scorePari(pari, null, P1).total).toBe(0)
    expect(scorePari(null, results, P1).total).toBe(0)
  })
})

describe('classementPeriode', () => {
  const mk = (id, player_id, periode, created_at, over = {}) => ({
    ...pari, id, player_id, periode, created_at, ...over,
  })

  it('sans résultats, pas de classement', () => {
    expect(classementPeriode([pari], P1, null)).toEqual([])
  })

  it('seul le dernier pari de la période compte, même s\'il est moins bon', () => {
    const paris = [
      mk(1, 'x', 1, '2026-05-01T10:00:00Z'),                          // 26 pts
      mk(2, 'x', 1, '2026-06-01T10:00:00Z', { m4: 'B', m5: 10 }),     // plus faible
    ]
    const c = classementPeriode(paris, P1, results)
    expect(c).toHaveLength(1)
    expect(c[0].pari.id).toBe(2)
    expect(c[0].scores.total).toBe(18)
  })

  it('un joueur sans pari dans la période n\'apparaît pas', () => {
    const paris = [mk(1, 'x', 1, '2026-05-01T10:00:00Z'), mk(2, 'y', 2, '2026-10-01T10:00:00Z')]
    expect(classementPeriode(paris, P1, results).map(e => e.player_id)).toEqual(['x'])
    expect(classementPeriode(paris, P2, results).map(e => e.player_id)).toEqual(['y'])
    expect(classementPeriode(paris, P3, results)).toEqual([])
  })

  it('trie par score décroissant avec des rangs 1..n', () => {
    const paris = [
      mk(1, 'faible', 1, '2026-05-01T10:00:00Z', { m4: 'B', m5: 10 }),
      mk(2, 'fort', 1, '2026-05-02T10:00:00Z'),
    ]
    const c = classementPeriode(paris, P1, results)
    expect(c.map(e => [e.player_id, e.rank])).toEqual([['fort', 1], ['faible', 2]])
  })

  it('égalité de score : le meilleur pronostic 2 passe devant, même si l\'autre pari est plus ancien', () => {
    const base = { m1: [], m3: [], m4: '' }
    const paris = [
      // Y, plus ancien : m2 = 2 pts (A) + m5 = 2 pts → 4
      mk(1, 'y', 3, '2026-12-01T10:00:00Z', { ...base, m2: { A: 31 }, m5: 53 }),
      // X, plus récent : m2 = 4 pts (A et C) + rien d'autre → 4
      mk(2, 'x', 3, '2026-12-05T10:00:00Z', { ...base, m2: { A: 30, C: 24 }, m5: null }),
    ]
    const c = classementPeriode(paris, P3, results)
    expect(c.map(e => e.scores.total)).toEqual([4, 4])
    expect(c.map(e => e.player_id)).toEqual(['x', 'y'])
  })

  it('égalité parfaite : le pari le plus ancien passe devant', () => {
    const paris = [
      mk(1, 'recent', 1, '2026-06-01T10:00:00Z'),
      mk(2, 'ancien', 1, '2026-05-01T10:00:00Z'),
    ]
    expect(classementPeriode(paris, P1, results).map(e => e.player_id)).toEqual(['ancien', 'recent'])
  })
})

describe('periodeCourante', () => {
  const periodes = [
    { id: 1, ends_at: '2026-08-31T22:00:00Z' },
    { id: 3, ends_at: '2027-04-10T22:00:00Z' },
    { id: 2, ends_at: '2027-03-14T23:00:00Z' },
    { id: 4, ends_at: '2027-04-24T22:00:00Z' },
  ]
  it('renvoie la première période non terminée', () => {
    expect(periodeCourante(periodes, new Date('2026-11-12T10:00:00Z')).id).toBe(2)
    expect(periodeCourante(periodes, new Date('2026-08-31T21:59:59Z')).id).toBe(1)
  })
  it('la fin de période est exclusive', () => {
    expect(periodeCourante(periodes, new Date('2026-08-31T22:00:00Z')).id).toBe(2)
  })
  it('renvoie null une fois le jeu fermé', () => {
    expect(periodeCourante(periodes, new Date('2027-04-25T00:00:00Z'))).toBeNull()
  })
})

describe('heure de Paris', () => {
  it('convertit en hiver (UTC+1) et en été (UTC+2)', () => {
    expect(parisVersIso('2027-03-15T00:00')).toBe('2027-03-14T23:00:00.000Z')
    expect(parisVersIso('2026-09-01T00:00')).toBe('2026-08-31T22:00:00.000Z')
  })
  it('fait l\'aller-retour', () => {
    for (const iso of ['2026-08-31T22:00:00.000Z', '2027-03-14T23:00:00.000Z', '2027-04-10T22:00:00.000Z']) {
      expect(parisVersIso(isoVersParis(iso))).toBe(iso)
    }
    expect(isoVersParis('2027-04-24T22:00:00.000Z')).toBe('2027-04-25T00:00')
  })
})

describe('mode démo', () => {
  it('resultatsComplets exige les deux tours', () => {
    expect(resultatsComplets(null)).toBe(false)
    expect(resultatsComplets({ candidates: ['A'], scores: { A: 100 }, finalists: ['A', 'B'], winner: '', winnerScore: null })).toBe(false)
    expect(resultatsComplets(results)).toBe(true)
  })

  it('un pari de démo se classe parmi les vrais paris sans les modifier', () => {
    const vrais = [
      { ...pari, id: 1, player_id: 'x', periode: 1 },                                  // 26 pts
      { ...pari, id: 2, player_id: 'y', periode: 1, m4: 'B', m5: 10 },                 // 18 pts
    ]
    const demo = { ...pari, id: -1, player_id: '__demo__', periode: 1, created_at: new Date().toISOString() }
    const c = classementPeriode([...vrais, demo], P1, results)
    expect(c.map(e => e.player_id)).toEqual(['x', '__demo__', 'y'])
    expect(c.find(e => e.player_id === '__demo__').rank).toBe(2) // égalité avec x : x est plus ancien
    expect(vrais).toHaveLength(2)
  })
})

describe('bonus d\'anticipation', () => {
  // Fin de la période 3 : 11 avril 2027, 00:00 heure de Paris
  const periodes = [
    { ...P1, ends_at: '2026-08-31T22:00:00Z' },
    { ...P2, ends_at: '2027-03-14T23:00:00Z' },
    { ...P3, ends_at: '2027-04-10T22:00:00Z' },
    { ...P4, ends_at: '2027-04-24T22:00:00Z' },
  ]

  it('+1 point par mois entier d\'avance', () => {
    expect(bonusAnticipation('2026-04-01T10:00:00Z', periodes)).toBe(12)
    expect(bonusAnticipation('2026-04-23T10:00:00Z', periodes)).toBe(11)
    expect(bonusAnticipation('2026-11-12T10:00:00Z', periodes)).toBe(4)
  })
  it('un mois n\'est acquis qu\'une fois révolu (heure de Paris)', () => {
    // 11 décembre 2026 à 00:00 (Paris) → 4 mois pile ; une minute plus tard → 3
    expect(bonusAnticipation('2026-12-10T23:00:00Z', periodes)).toBe(4)
    expect(bonusAnticipation('2026-12-10T23:01:00Z', periodes)).toBe(3)
  })
  it('0 la veille du scrutin, en période 4, ou sans période 3', () => {
    expect(bonusAnticipation('2027-04-10T12:00:00Z', periodes)).toBe(0)
    expect(bonusAnticipation('2027-04-15T12:00:00Z', periodes)).toBe(0)
    expect(bonusAnticipation('2026-04-01T10:00:00Z', [])).toBe(0)
    expect(bonusAnticipation(null, periodes)).toBe(0)
  })
})

describe('classementGeneral', () => {
  const periodes = [
    { ...P1, ends_at: '2026-08-31T22:00:00Z' },
    { ...P2, ends_at: '2027-03-14T23:00:00Z' },
    { ...P3, ends_at: '2027-04-10T22:00:00Z' },
    { ...P4, ends_at: '2027-04-24T22:00:00Z' },
  ]
  const mk = (id, player_id, periode, created_at, over = {}) => ({
    ...pari, id, player_id, periode, created_at, ...over,
  })

  it('sans résultats, pas de classement', () => {
    expect(classementGeneral([pari], periodes, null)).toEqual([])
  })

  it('chaque pari est une ligne : un joueur peut apparaître plusieurs fois', () => {
    const paris = [
      mk(1, 'x', 1, '2026-05-01T10:00:00Z'),
      mk(2, 'x', 2, '2026-11-12T10:00:00Z'),
    ]
    const c = classementGeneral(paris, periodes, results)
    expect(c.map(e => [e.pari.id, e.rank])).toEqual([[1, 1], [2, 2]])
  })

  it('total = barème de la période du pari + bonus', () => {
    const c = classementGeneral([mk(1, 'x', 1, '2026-05-01T10:00:00Z')], periodes, results)
    expect(c[0].scores).toMatchObject({ bareme: 26, bonus: 11, total: 37 })
  })

  it('le bonus peut renverser un meilleur pari posé plus tard', () => {
    const paris = [
      mk(1, 'tard', 2, '2027-02-01T10:00:00Z'),                          // 26 + 2
      mk(2, 'tot', 1, '2026-04-30T10:00:00Z', { m4: 'B', m5: 10 }),      // 18 + 11
    ]
    expect(classementGeneral(paris, periodes, results).map(e => e.player_id)).toEqual(['tot', 'tard'])
  })

  it('chaque pari est scoré avec le barème de sa période', () => {
    const c = classementGeneral([mk(1, 'x', 4, '2027-04-15T10:00:00Z')], periodes, results)
    expect(c[0].scores).toMatchObject({ bareme: 8, bonus: 0, total: 8 })
  })

  it('départage : pronostic 2, puis pari le plus ancien', () => {
    const base = { m1: [], m3: [], m4: '' }
    const paris = [
      mk(1, 'y', 3, '2027-03-20T10:00:00Z', { ...base, m2: { A: 31 }, m5: 53 }),
      mk(2, 'x', 3, '2027-03-20T10:00:00Z', { ...base, m2: { A: 30, C: 24 }, m5: null }),
    ]
    const c = classementGeneral(paris, periodes, results)
    expect(c.map(e => e.scores.total)).toEqual([c[0].scores.total, c[0].scores.total])
    expect(c.map(e => e.player_id)).toEqual(['x', 'y'])
  })
})

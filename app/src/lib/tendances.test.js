import { describe, it, expect } from 'vitest'
import { dernierAvis, tendancesScores, tendancesDuels, tendancesVainqueurs, tendancesScoreFinal, nombreDeJoueurs } from './tendances'

const p = (id, player_id, created_at, o = {}) => ({ id, player_id, created_at, m1: [], m2: {}, m3: [], m4: '', m5: null, ...o })

const paris = [
  p(1, 'x', '2026-05-01T10:00:00Z', { m2: { A: 30, B: 25 }, m3: ['A', 'B'], m4: 'A', m5: 52 }),
  p(2, 'y', '2026-05-02T10:00:00Z', { m2: { A: 34, C: 20 }, m3: ['B', 'A'], m4: 'A', m5: 55 }),
  p(3, 'z', '2026-05-03T10:00:00Z', { m2: { B: 40 }, m3: ['B', 'C'], m4: 'B' }),
  // x change d'avis plus tard : seul le pronostic 4 est renseigné (période 4)
  p(4, 'x', '2026-09-01T10:00:00Z', { m4: 'B', m5: 58 }),
]

describe('tendances', () => {
  it('le dernier pari qui renseigne chaque pronostic compte, pas le dernier pari tout court', () => {
    expect(dernierAvis(paris, 'm4').get('x').valeur).toBe('B')   // pari 4
    expect(dernierAvis(paris, 'm2').get('x').valeur).toEqual({ A: 30, B: 25 }) // pari 1, le 4 n'a pas de scores
    expect(nombreDeJoueurs(paris, 'm2')).toBe(3)
  })

  it('scores par candidat : triés par poids dans le groupe, avec moyenne et fourchette', () => {
    const t = tendancesScores(paris)
    // B pèse 65 (25 + 40), A 64 (30 + 34), C 20
    expect(t.map(c => c.nom)).toEqual(['B', 'A', 'C'])
    expect(t[1]).toMatchObject({ nom: 'A', n: 2, min: 30, max: 34, moy: 32 })
    expect(t[1].valeurs.map(v => v.player_id)).toEqual(['y', 'x'])
    expect(t[0]).toMatchObject({ nom: 'B', n: 2, moy: 32.5 })
  })

  it('ignore les scores nuls ou invalides', () => {
    const t = tendancesScores([p(1, 'x', '2026-05-01T10:00:00Z', { m2: { A: 0, B: 'abc', C: '12.5' } })])
    expect(t.map(c => c.nom)).toEqual(['C'])
  })

  it('duels : l\'ordre des deux noms n\'importe pas', () => {
    const d = tendancesDuels(paris)
    expect(d[0]).toMatchObject({ duo: ['A', 'B'] })
    expect(d[0].joueurs.sort()).toEqual(['x', 'y'])
    expect(d[1].duo).toEqual(['B', 'C'])
  })

  it('vainqueurs et score final', () => {
    const v = tendancesVainqueurs(paris)
    expect(v[0].nom).toBe('B')
    expect(v[0].joueurs.sort()).toEqual(['x', 'z'])
    const f = tendancesScoreFinal(paris)
    expect(f).toMatchObject({ n: 2, min: 55, max: 58, moy: 56.5 })
    expect(tendancesScoreFinal([p(1, 'x', '2026-05-01T10:00:00Z')])).toBeNull()
  })
})

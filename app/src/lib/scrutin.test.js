import { describe, it, expect } from 'vitest'
import { parseListe, lireScores, finalistesDepuisScores, totalSaisi, totalJuste, resultatSecondTour, scoreAInitial } from './scrutin'

describe('saisie des résultats (admin)', () => {
  it('liste : lignes vides et doublons retirés, ordre conservé', () => {
    expect(parseListe(' A \n\nB\na\n  C  ')).toEqual(['A', 'B', 'C'])
    expect(parseListe('')).toEqual([])
  })

  it('lecture des scores et manquants', () => {
    const r = lireScores(['A', 'B', 'C'], { A: '30', B: 'x', C: '' })
    expect(r.nombres).toEqual({ A: 30 })
    expect(r.manquants).toEqual(['B', 'C'])
  })

  it('finalistes : les deux plus hauts scores', () => {
    expect(finalistesDepuisScores(['A', 'B', 'C'], { A: '20', B: '31', C: '24' })).toEqual(['B', 'C'])
    expect(finalistesDepuisScores(['A', 'B'], { A: '50' })).toEqual([])
  })

  it('total juste : tous les candidats renseignés et 100 % à 0,2 près', () => {
    const c = ['A', 'B']
    expect(totalSaisi(c, { A: '60', B: '40.1' })).toBeCloseTo(100.1)
    expect(totalJuste(c, { A: '60', B: '40.1' })).toBe(true)
    expect(totalJuste(c, { A: '60', B: '39.5' })).toBe(false)
    expect(totalJuste(c, { A: '100' })).toBe(false)
  })

  it('2nd tour : complément à 100, vainqueur = score le plus haut', () => {
    expect(resultatSecondTour(['A', 'C'], '47.5')).toEqual({ scoreA: 47.5, scoreB: 52.5, winner: 'C', winnerScore: 52.5 })
    expect(resultatSecondTour(['A', 'C'], '60')).toMatchObject({ winner: 'A', winnerScore: 60 })
    expect(resultatSecondTour(['A', 'C'], '101')).toBeNull()
    expect(resultatSecondTour(['A'], '50')).toBeNull()
  })

  it('score du premier finaliste retrouvé depuis des résultats enregistrés', () => {
    expect(scoreAInitial({ finalists: ['A', 'C'], winner: 'A', winnerScore: 53.5 })).toBe('53.5')
    expect(scoreAInitial({ finalists: ['A', 'C'], winner: 'C', winnerScore: 53.5 })).toBe('46.5')
    expect(scoreAInitial({ finalists: ['A', 'C'], winner: '', winnerScore: null })).toBe('')
  })
})

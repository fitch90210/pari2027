import { describe, it, expect } from 'vitest'
import { photoConnue, descriptionAcceptable } from './photos'

describe('photos des candidats', () => {
  it('liste figée, insensible à la casse et aux accents', () => {
    expect(photoConnue('Jordan Bardella')).toMatch(/^https:\/\//)
    expect(photoConnue('  edouard philippe ')).toBe(photoConnue('Édouard Philippe'))
    expect(photoConnue('Candidat inconnu')).toBeNull()
  })

  it('photo trouvée en ligne acceptée seulement pour une personne', () => {
    expect(descriptionAcceptable('homme politique français')).toBe(true)
    expect(descriptionAcceptable('haute fonctionnaire et militante politique française')).toBe(true)
    expect(descriptionAcceptable('page d\'homonymie de Wikimedia')).toBe(false)
    expect(descriptionAcceptable('capitale et ville la plus peuplée de France')).toBe(false)
    expect(descriptionAcceptable(undefined)).toBe(false)
  })
})

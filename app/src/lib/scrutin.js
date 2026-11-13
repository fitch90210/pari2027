// Logique pure de la saisie des résultats par l'admin (mêmes règles que l'ancienne page).

const norme = t => t.trim().toLowerCase()

// Liste de candidats saisie « un par ligne » : lignes vides et doublons retirés, l'ordre est conservé.
export function parseListe(brut) {
  const vus = new Set()
  return brut.split('\n').map(l => l.trim()).filter(l => {
    if (!l || vus.has(norme(l))) return false
    vus.add(norme(l))
    return true
  })
}

// Scores saisis (chaînes) → { nombres: { candidat: nombre }, manquants: [candidats sans score valide] }
export function lireScores(candidats, saisis) {
  const nombres = {}
  const manquants = []
  for (const c of candidats) {
    const v = parseFloat(saisis[c])
    if (Number.isNaN(v)) manquants.push(c); else nombres[c] = v
  }
  return { nombres, manquants }
}

// Les deux plus hauts scores désignent les finalistes ([] tant qu'il y a moins de deux scores).
export function finalistesDepuisScores(candidats, saisis) {
  const classes = candidats
    .map(c => ({ nom: c, score: parseFloat(saisis[c]) }))
    .filter(x => !Number.isNaN(x.score))
    .sort((a, b) => b.score - a.score)
  return classes.length < 2 ? [] : [classes[0].nom, classes[1].nom]
}

export function totalSaisi(candidats, saisis) {
  return candidats.reduce((t, c) => { const v = parseFloat(saisis[c]); return t + (Number.isNaN(v) ? 0 : v) }, 0)
}

// Le total n'est juste que si tous les candidats ont un score et que la somme fait 100 (0,2 de tolérance).
export function totalJuste(candidats, saisis) {
  const { manquants } = lireScores(candidats, saisis)
  return manquants.length === 0 && Math.abs(totalSaisi(candidats, saisis) - 100) < 0.2
}

// 2nd tour : on saisit le score du premier finaliste, l'autre est le complément à 100.
export function resultatSecondTour(finalistes, scoreA) {
  const a = parseFloat(scoreA)
  if (finalistes.length < 2 || Number.isNaN(a) || a < 0 || a > 100) return null
  const b = parseFloat((100 - a).toFixed(1))
  return { scoreA: a, scoreB: b, winner: a >= b ? finalistes[0] : finalistes[1], winnerScore: Math.max(a, b) }
}

// Score du premier finaliste, retrouvé depuis des résultats déjà enregistrés (chaîne vide sinon).
export function scoreAInitial(results) {
  const f = results?.finalists ?? []
  if (results?.winnerScore == null || f.length < 2) return ''
  return results.winner === f[0] ? String(results.winnerScore) : String(parseFloat((100 - results.winnerScore).toFixed(1)))
}

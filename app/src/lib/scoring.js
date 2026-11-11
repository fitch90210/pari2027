// ============================================================
// Moteur de scoring — Jeu de Paris 2027
// ============================================================

const normalize = (str) => str?.trim().toLowerCase() ?? ''

// Manche 1 : candidats prédits vs réels
export function scoreM1(predicted, realCandidates) {
  if (!predicted?.length || !realCandidates?.length) return 0
  const realSet = new Set(realCandidates.map(normalize))
  const hits = predicted.filter(c => realSet.has(normalize(c))).length
  let pts = hits * 2
  if (predicted.length === realCandidates.length) pts += 3
  return pts
}

// Manche 2 : scores prédits vs réels (±2 pts de tolérance)
export function scoreM2(predictedScores, realScores, predictedCandidates) {
  if (!predictedScores || !realScores || !predictedCandidates?.length) return 0
  let pts = 0
  const realNorm = Object.fromEntries(
    Object.entries(realScores).map(([k, v]) => [normalize(k), v])
  )
  predictedCandidates.forEach(candidat => {
    const pred = predictedScores[candidat]
    const real = realNorm[normalize(candidat)]
    if (pred == null || real == null) return
    if (Math.abs(parseFloat(pred) - parseFloat(real)) <= 2) pts += 2
  })
  return pts
}

// Manche 3 : les deux finalistes
export function scoreM3(predicted, realFinalists) {
  if (!predicted?.length || !realFinalists?.length) return 0
  const realSet = new Set(realFinalists.map(normalize))
  const hits = predicted.filter(c => realSet.has(normalize(c))).length
  if (hits === 2) return 8
  if (hits === 1) return 3
  return 0
}

// Manche 4 : vainqueur prédit
export function scoreM4(predicted, realWinner) {
  if (!predicted || !realWinner) return 0
  return normalize(predicted) === normalize(realWinner) ? 6 : 0
}

// Manche 5 : score du vainqueur au 2nd tour (±2 pts)
// Le score saisi est celui du candidat A ; le candidat avec le plus haut score = vainqueur
// On score le score prédit du vainqueur (celui avec le score le plus élevé) contre winnerScore
export function scoreM5(predicted, realScore) {
  if (predicted == null || realScore == null) return 0
  return Math.abs(parseFloat(predicted) - parseFloat(realScore)) <= 2 ? 2 : 0
}

// Score détaillé pour une phase (S1 ou S2)
// En phase 2, M1 n'existe pas (candidats imposés) et M2 itère sur les candidats officiels
export function scoreDetail(pronostic, results, phase = 1) {
  const empty = { m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, total: 0 }
  if (!results || !pronostic) return empty
  const m1 = phase === 1 ? scoreM1(pronostic.m1, results.candidates) : 0
  const m2CandidateList = phase === 1 ? pronostic.m1 : results.candidates
  const m2 = scoreM2(pronostic.m2, results.scores, m2CandidateList)
  const m3 = scoreM3(pronostic.m3, results.finalists)
  const m4 = scoreM4(pronostic.m4, results.winner)
  const m5 = scoreM5(pronostic.m5, results.winnerScore)
  return { m1, m2, m3, m4, m5, total: m1 + m2 + m3 + m4 + m5 }
}

// Score S3 : uniquement M5 du pronostic S3
// Le joueur a attribué un score à chaque finaliste (m5scoreA + m5scoreB = 100)
// On score le score du vainqueur (le plus haut des deux) contre winnerScore
export function scoreS3(pronosticS3, results) {
  const empty = { m5: 0, total: 0 }
  if (!results || !pronosticS3) return empty
  // En S3 m5 = score du candidat A (finaliste[0]), score B = 100 - m5
  // Le vainqueur est celui avec le score le plus élevé
  const scoreA = parseFloat(pronosticS3.m5)
  if (isNaN(scoreA)) return empty
  const winnerPredicted = scoreA >= 50 ? scoreA : 100 - scoreA
  const m5 = scoreM5(winnerPredicted, results.winnerScore)
  return { m5, total: m5 }
}

// Classement général : S1 + S2 + S3 scorées indépendamment et additionnées
// En cas d'égalité : départage par la somme des M2
export function computeLeaderboard(players, pronosticsMap, results) {
  if (!results) return []

  const entries = players.map(player => {
    const pMap = pronosticsMap[player.id] || {}
    const s1 = pMap.s1 || null
    const s2 = pMap.s2 || null
    const s3 = pMap.s3 || null

    const scoresS1 = scoreDetail(s1, results, 1)
    const scoresS2 = scoreDetail(s2, results, 2)
    const scoresS3 = scoreS3(s3, results)

    const total = scoresS1.total + scoresS2.total + scoresS3.total

    return { player, scoresS1, scoresS2, scoresS3, total }
  })

  return entries
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total
      const m2A = (a.scoresS1.m2 ?? 0) + (a.scoresS2.m2 ?? 0)
      const m2B = (b.scoresS1.m2 ?? 0) + (b.scoresS2.m2 ?? 0)
      return m2B - m2A
    })
    .map((e, i) => ({ ...e, rank: i + 1 }))
}

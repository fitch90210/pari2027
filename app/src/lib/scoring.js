// ============================================================
// Moteur de scoring — Jeu de Paris 2027
// ============================================================

import { isoVersParis } from './periodes'

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

// ============================================================
// Scoring par période (refonte « paris »)
// ============================================================

// Score d'un pari, limité aux pronostics scorés de la période (`periode.scored`).
// - Pronostic 2 : la liste de référence est celle du pari (m1) en périodes 1 et 2,
//   et les vrais candidats du 1er tour à partir de la période 3 (liste officielle connue).
// - Pronostic 5 : toujours le score prédit pour le vainqueur.
export function scorePari(pari, results, periode) {
  const empty = { m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, total: 0 }
  if (!pari || !results || !periode) return empty
  const scored = new Set(periode.scored ?? [])
  const m1 = scored.has('m1') ? scoreM1(pari.m1, results.candidates) : 0
  const m2List = periode.id <= 2 ? pari.m1 : results.candidates
  const m2 = scored.has('m2') ? scoreM2(pari.m2, results.scores, m2List) : 0
  const m3 = scored.has('m3') ? scoreM3(pari.m3, results.finalists) : 0
  const m4 = scored.has('m4') ? scoreM4(pari.m4, results.winner) : 0
  const m5 = scored.has('m5') ? scoreM5(pari.m5, results.winnerScore) : 0
  return { m1, m2, m3, m4, m5, total: m1 + m2 + m3 + m4 + m5 }
}

// Classement d'une période : le dernier pari de chaque joueur posé dans la période.
// Un joueur sans pari dans la période n'apparaît pas.
// Départage : score du pronostic 2, puis pari le plus ancien.
// Sans résultats saisis, il n'y a pas de classement.
export function classementPeriode(paris, periode, results) {
  if (!results || !periode) return []

  const dernierParJoueur = new Map()
  for (const pari of paris) {
    if (pari.periode !== periode.id) continue
    const t = new Date(pari.created_at).getTime()
    const cur = dernierParJoueur.get(pari.player_id)
    if (!cur || t > cur.t || (t === cur.t && pari.id > cur.pari.id)) {
      dernierParJoueur.set(pari.player_id, { pari, t })
    }
  }

  return [...dernierParJoueur.values()]
    .map(({ pari, t }) => ({
      player_id: pari.player_id,
      pari,
      scores: scorePari(pari, results, periode),
      t,
    }))
    .sort((a, b) =>
      b.scores.total - a.scores.total ||
      b.scores.m2 - a.scores.m2 ||
      a.t - b.t ||
      a.pari.id - b.pari.id
    )
    .map(({ player_id, pari, scores }, i) => ({ player_id, pari, scores, rank: i + 1 }))
}

// ============================================================
// Classement général (révision du 12/11/2026)
// ============================================================
// Chaque pari est scoré indépendamment (barème de sa période) et reçoit un
// bonus d'anticipation : +1 point par mois entier entre sa date et la fin de
// la période 3 (la veille du 1er tour). Un pari de la période 4 gagne 0.
// Le classement liste des paris : un joueur peut y figurer plusieurs fois.

export const BONUS_PAR_MOIS = 1
const PERIODE_BORNE_BONUS = 3

// Mois entiers (heure de Paris) entre deux instants ISO ; 0 si `finIso` est passé.
function moisEntiers(debutIso, finIso) {
  const a = isoVersParis(debutIso)
  const b = isoVersParis(finIso)
  let mois = (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + (Number(b.slice(5, 7)) - Number(a.slice(5, 7)))
  if (b.slice(8) < a.slice(8)) mois-- // jour et heure du mois non encore atteints
  return Math.max(0, mois)
}

// Bonus d'un pari daté de `createdAt`, selon la fin de la période 3.
export function bonusAnticipation(createdAt, periodes) {
  const fin = periodes?.find(p => p.id === PERIODE_BORNE_BONUS)?.ends_at
  if (!createdAt || !fin) return 0
  return moisEntiers(createdAt, fin) * BONUS_PAR_MOIS
}

// Classement général : une ligne par pari, trié par total (barème + bonus).
// Départage : score du pronostic 2, puis pari le plus ancien.
// Sans résultats saisis, il n'y a pas de classement.
export function classementGeneral(paris, periodes, results) {
  if (!results || !periodes?.length) return []

  return paris
    .map(pari => {
      const periode = periodes.find(p => p.id === pari.periode)
      const base = scorePari(pari, results, periode)
      const bonus = bonusAnticipation(pari.created_at, periodes)
      return {
        player_id: pari.player_id,
        pari,
        scores: { ...base, bareme: base.total, bonus, total: base.total + bonus },
        t: new Date(pari.created_at).getTime(),
      }
    })
    .sort((a, b) =>
      b.scores.total - a.scores.total ||
      b.scores.m2 - a.scores.m2 ||
      a.t - b.t ||
      a.pari.id - b.pari.id
    )
    .map(({ player_id, pari, scores }, i) => ({ player_id, pari, scores, rank: i + 1 }))
}

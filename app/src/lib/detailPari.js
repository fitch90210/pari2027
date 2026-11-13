import { pourcent, nombre } from './parcours'
import { scorePari, bonusAnticipation } from './scoring'

const TITRES = { // (titres des pronostics isolés)
  m1: 'Candidats au 1er tour',
  m2: 'Scores du 1er tour',
  m3: 'Finalistes',
  m4: 'Vainqueur',
  m5: 'Score du vainqueur',
}

// Valeur lisible d'un pronostic, ou null s'il n'est pas renseigné.
export function valeurTexte(cle, pari) {
  if (cle === 'm1') return pari.m1?.length ? pari.m1.join(', ') : null
  if (cle === 'm2') {
    const l = Object.entries(pari.m2 ?? {}).filter(([, v]) => nombre(v) > 0).sort((a, b) => nombre(b[1]) - nombre(a[1]))
    return l.length ? l.map(([c, v]) => `${c} ${pourcent(v)}`).join(' · ') : null
  }
  if (cle === 'm3') { const f = (pari.m3 ?? []).filter(Boolean); return f.length ? f.join(' et ') : null }
  if (cle === 'm4') return pari.m4 || null
  if (cle === 'm5') return pari.m5 != null ? pourcent(pari.m5) : null
  return null
}

// Candidats avec leur score, du plus haut au plus bas ; les candidats sans score viennent ensuite.
function candidatsAvecScores(pari, inclureListe) {
  const m2 = pari.m2 ?? {}
  const noms = inclureListe ? [...(pari.m1 ?? []), ...Object.keys(m2).filter(c => !(pari.m1 ?? []).includes(c))] : Object.keys(m2)
  return noms
    .map(nom => ({ nom, valeur: nombre(m2[nom]) > 0 ? pourcent(m2[nom]) : null, v: nombre(m2[nom]) }))
    .sort((a, b) => b.v - a.v)
    .map(({ nom, valeur }) => ({ nom, valeur }))
}

// Lignes de détail d'un pari, regroupées comme dans le parcours : candidats + scores, finalistes, vainqueur + score.
// `items` : liste (candidat, score) ; `valeur` : texte. Points cumulés des pronostics regroupés si les résultats sont connus.
export function detailPari(pari, periode, results, periodes) {
  const scores = results && periode ? scorePari(pari, results, periode) : null
  const bonus = bonusAnticipation(pari.created_at, periodes)
  const ouverts = new Set(periode?.scored ?? [])
  const pts = (...cles) => (scores ? cles.reduce((t, k) => t + scores[k], 0) : null)
  const lignes = []

  if (ouverts.has('m1') && ouverts.has('m2')) {
    const items = candidatsAvecScores(pari, true)
    lignes.push({ cle: 'm12', titre: 'Candidats et scores du 1er tour', items, valeur: items.length ? null : undefined, points: pts('m1', 'm2') })
  } else if (ouverts.has('m2')) {
    const items = candidatsAvecScores(pari, false)
    lignes.push({ cle: 'm2', titre: 'Scores du 1er tour', items, points: pts('m2') })
  }
  if (ouverts.has('m3')) lignes.push({ cle: 'm3', titre: 'Finalistes', valeur: valeurTexte('m3', pari), points: pts('m3') })
  if (ouverts.has('m4') && ouverts.has('m5')) {
    const v = [pari.m4 || null, pari.m5 != null ? pourcent(pari.m5) : null].filter(Boolean)
    lignes.push({ cle: 'm45', titre: 'Vainqueur et son score', valeur: v.length ? v.join(' · ') : null, points: pts('m4', 'm5') })
  } else {
    if (ouverts.has('m4')) lignes.push({ cle: 'm4', titre: 'Vainqueur', valeur: valeurTexte('m4', pari), points: pts('m4') })
    if (ouverts.has('m5')) lignes.push({ cle: 'm5', titre: 'Score du vainqueur', valeur: valeurTexte('m5', pari), points: pts('m5') })
  }

  return {
    lignes, bonus,
    bareme: scores ? scores.total : null,
    total: scores ? scores.total + bonus : null,
  }
}

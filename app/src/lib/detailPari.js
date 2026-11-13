import { pourcent, nombre } from './parcours'
import { scorePari, bonusAnticipation } from './scoring'

const TITRES = {
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

// Lignes de détail d'un pari : les pronostics ouverts dans sa période, avec leurs points si les résultats sont connus.
export function detailPari(pari, periode, results, periodes) {
  const scores = results && periode ? scorePari(pari, results, periode) : null
  const bonus = bonusAnticipation(pari.created_at, periodes)
  const lignes = (periode?.scored ?? []).map(cle => ({
    cle, titre: TITRES[cle], valeur: valeurTexte(cle, pari), points: scores ? scores[cle] : null,
  }))
  return {
    lignes, bonus,
    bareme: scores ? scores.total : null,
    total: scores ? scores.total + bonus : null,
  }
}

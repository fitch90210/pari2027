import { classementGeneral } from './scoring'

export const DEMO_ID = '__demo__'

// Date à laquelle on « pose » le pari de démonstration : le début de la période choisie
// (une minute après la fin de la précédente ; pour la période 1, le premier vrai pari).
export function dateDemoPari(periodeId, periodes, paris) {
  const precedente = periodes.find(p => p.id === periodeId - 1)
  if (precedente) return new Date(new Date(precedente.ends_at).getTime() + 60_000).toISOString()
  const t = paris.map(p => new Date(p.created_at).getTime())
  return new Date(t.length ? Math.min(...t) : Date.now()).toISOString()
}

// Calcule le score d'un pari « à rebours » et la place qu'il aurait prise parmi les vrais paris.
// Rien n'est enregistré : tout se passe dans le navigateur.
export function jouerDemo(valeurs, periode, periodes, paris, results) {
  const pari = {
    id: -1, player_id: DEMO_ID, periode: periode.id,
    created_at: dateDemoPari(periode.id, periodes, paris), ...valeurs,
  }
  const classement = classementGeneral([...paris, pari], periodes, results)
  const moi = classement.find(e => e.player_id === DEMO_ID)
  return { pari, periode, rang: moi?.rank ?? null, sur: classement.length, scores: moi?.scores ?? null }
}

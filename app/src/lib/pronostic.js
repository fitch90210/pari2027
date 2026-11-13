// Lecture d'un pronostic enregistré (ligne de la table `paris`), pour l'affichage.
import { pourcent } from './parcours'

export const pseudoDe = pari => pari?.pseudo?.trim() || 'Anonyme'

// Clé d'un pseudo : « Léa », « léa » et « Léa  » désignent la même personne.
export const clePseudo = pseudo => String(pseudo ?? '').trim().toLowerCase()

const arrondi = x => Math.round(x * 10) / 10

// Du plus récent au plus ancien.
export const parRecence = (a, b) => new Date(b.created_at) - new Date(a.created_at) || b.id - a.id

// 1er tour : [{ nom, v }] du plus haut au plus bas ; les candidats sans score (anciens paris) à la fin, v = null.
export function premierTour(pari) {
  const m2 = pari?.m2 ?? {}
  const avecScore = Object.entries(m2)
    .map(([nom, brut]) => ({ nom, v: parseFloat(brut) }))
    .filter(x => !Number.isNaN(x.v) && x.v > 0)
    .sort((a, b) => b.v - a.v || a.nom.localeCompare(b.nom, 'fr'))
  const cites = new Set(avecScore.map(x => x.nom))
  const sansScore = (pari?.m1 ?? []).filter(nom => !cites.has(nom)).map(nom => ({ nom, v: null }))
  return [...avecScore, ...sansScore]
}

// 2nd tour : { vainqueur, vaincu, scoreVainqueur, scoreVaincu }, ou null si le pronostic n'en a pas.
// Le score est celui saisi (certains anciens paris donnent moins de 50 % au vainqueur : affiché tel quel).
export function secondTour(pari) {
  const finalistes = (pari?.m3 ?? []).filter(Boolean)
  if (!pari?.m4 || finalistes.length < 2 || !finalistes.includes(pari.m4)) return null
  const vaincu = finalistes.find(f => f !== pari.m4)
  const sv = pari.m5 == null ? null : parseFloat(pari.m5)
  return {
    vainqueur: pari.m4,
    vaincu,
    scoreVainqueur: sv,
    scoreVaincu: sv == null ? null : arrondi(100 - sv),
  }
}

// Résumé sur une ligne : le 2nd tour s'il existe, sinon le haut du 1er tour.
export function resumePronostic(pari) {
  const t2 = secondTour(pari)
  if (t2) return t2.scoreVainqueur != null ? `${t2.vainqueur} gagne avec ${pourcent(t2.scoreVainqueur)}` : `${t2.vainqueur} gagne`
  const t1 = premierTour(pari).slice(0, 3)
  return t1.length ? `1er tour : ${t1.map(c => (c.v != null ? `${c.nom} ${pourcent(c.v)}` : c.nom)).join(', ')}` : 'Pronostic'
}

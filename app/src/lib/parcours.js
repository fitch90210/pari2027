// Logique pure du parcours « Parier » (étapes, répartition des pourcentages, finalistes).
// Les valeurs du formulaire suivent le format de lib/pari.js : m2 et m5 sont des chaînes.

const ORDRE = ['m1', 'm2', 'm3', 'm4', 'm5']

// Étapes proposées : les pronostics encore ouverts dans la période, regroupés quand ils vont ensemble.
// - 'm12' : candidats et score de chacun (on ajoute un candidat puis on règle son pourcentage, en une étape)
// - 'm45' : vainqueur et son score
// Dès la période 3, la liste des candidats est imposée : il ne reste que 'm2' (les scores).
export function etapesOuvertes(periode) {
  const ouverts = ORDRE.filter(k => periode?.scored?.includes(k))
  const o = new Set(ouverts)
  return ouverts.flatMap(k => {
    if (k === 'm1') return o.has('m2') ? ['m12'] : [k]
    if (k === 'm2') return o.has('m1') ? [] : [k]
    if (k === 'm4') return o.has('m5') ? ['m45'] : [k]
    if (k === 'm5') return o.has('m4') ? [] : [k]
    return [k]
  })
}

// Candidats parmi lesquels répartir les scores et choisir finalistes et vainqueur :
// la liste officielle dès la période 3, sinon ceux du pronostic 1.
export function candidatsDuPari(form, periode, officiels) {
  return periode.id >= 3 ? officiels : form.m1
}

export const nombre = v => {
  const n = parseFloat(v)
  return Number.isNaN(n) ? 0 : n
}

export function totalScores(form, candidats) {
  return candidats.reduce((somme, c) => somme + nombre(form.m2[c]), 0)
}

// Total à 100 % (0,15 de tolérance, comme le formulaire d'origine).
export const totalOk = total => Math.abs(total - 100) < 0.15

// Répartition égale par demi-points, la somme fait toujours exactement 100.
export function repartirEgalement(candidats) {
  const n = candidats.length
  if (n === 0) return {}
  const demis = Math.floor(200 / n)
  let reste = 200 - demis * n
  return Object.fromEntries(candidats.map(c => {
    const v = demis + (reste > 0 ? 1 : 0)
    if (reste > 0) reste--
    return [c, String(v / 2)]
  }))
}

// Les deux candidats aux meilleurs scores, ou null s'il y en a moins de deux.
export function finalistesProbables(candidats, m2) {
  const classes = candidats
    .map(c => ({ nom: c, score: parseFloat(m2[c]) }))
    .filter(x => !Number.isNaN(x.score) && x.score > 0)
    .sort((a, b) => b.score - a.score)
  return classes.length < 2 ? null : [classes[0].nom, classes[1].nom]
}

// « 32 » → « 32 % », « 32.5 » → « 32,5 % »
export const pourcent = v => `${String(v).replace('.', ',')} %`

// Logique pure du parcours « Pronostiquer » : 1er tour (candidats et pourcentages), 2nd tour, envoi.
// Formulaire : { m1: [noms, dans l'ordre d'ajout], m2: { nom: 'texte' }, m4: 'vainqueur', m5: 'texte' }.

export const nombre = v => {
  const n = parseFloat(v)
  return Number.isNaN(n) ? 0 : n
}

export function totalScores(form, candidats = form.m1) {
  return candidats.reduce((somme, c) => somme + nombre(form.m2[c]), 0)
}

// Total à 100 % (0,15 de tolérance, comme le serveur).
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

// Les deux candidats aux meilleurs scores (à égalité, le premier ajouté passe devant), ou null.
export function finalistesProbables(candidats, m2) {
  const classes = candidats
    .map((nom, i) => ({ nom, i, score: parseFloat(m2[nom]) }))
    .filter(x => !Number.isNaN(x.score) && x.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i)
  return classes.length < 2 ? null : [classes[0].nom, classes[1].nom]
}

// Le 1er tour est prêt quand au moins deux candidats ont un score et que le total fait 100 %.
export function premierTourPret(form) {
  return !!finalistesProbables(form.m1, form.m2) && totalOk(totalScores(form))
}

export const scoreVainqueurOk = v => v !== '' && nombre(v) > 50 && nombre(v) <= 100

// Valeurs envoyées à create_pronostic : seuls les candidats crédités d'un score.
export function valeursPourEnvoi(form) {
  const m2 = Object.fromEntries(
    form.m1.filter(c => nombre(form.m2[c]) > 0).map(c => [c, nombre(form.m2[c])])
  )
  return { m2, m3: finalistesProbables(form.m1, form.m2) ?? [], m4: form.m4, m5: nombre(form.m5) }
}

// Suggestions : [{ nom, n }], n = nombre de pronostics qui citent le candidat au 1er tour ;
// les plus cités d'abord, puis l'ordre de la liste. Les noms ajoutés à la main par d'autres sont proposés aussi.
export function trierParPopularite(options, paris) {
  const compte = new Map()
  for (const p of paris) for (const nom of new Set(p.m1 ?? [])) compte.set(nom, (compte.get(nom) ?? 0) + 1)
  const noms = [...options, ...[...compte.keys()].filter(n => !options.includes(n))]
  return noms.map((nom, i) => ({ nom, n: compte.get(nom) ?? 0, i }))
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .map(({ nom, n }) => ({ nom, n }))
}

// « 32 » → « 32 % », « 32.5 » → « 32,5 % » (espace insécable : le % ne passe jamais seul à la ligne)
export const pourcent = v => `${String(v).replace('.', ',')}\u00a0%`

// Tendances du groupe : l'avis actuel de chaque joueur, pronostic par pronostic.
// Pour chaque pronostic, on retient le pari le plus récent du joueur qui le renseigne
// (un pari de période 4 ne contient pas de scores : l'avis sur les scores reste celui d'avant).

const renseigne = (cle, v) => {
  if (cle === 'm1') return !!v?.length
  if (cle === 'm2') return !!v && Object.keys(v).length > 0
  if (cle === 'm3') return !!v?.filter(Boolean).length
  if (cle === 'm4') return !!v
  return v != null
}

const parDate = (a, b) => new Date(a.created_at) - new Date(b.created_at) || a.id - b.id
const arrondi = x => Math.round(x * 10) / 10

// Map player_id → { pari, valeur } : le dernier pari qui renseigne `cle`.
export function dernierAvis(paris, cle) {
  const avis = new Map()
  for (const pari of [...paris].sort(parDate)) {
    if (renseigne(cle, pari[cle])) avis.set(pari.player_id, { pari, valeur: pari[cle] })
  }
  return avis
}

function resumeChiffres(valeurs) {
  const vs = valeurs.map(x => x.v)
  return { n: vs.length, min: Math.min(...vs), max: Math.max(...vs), moy: arrondi(vs.reduce((a, b) => a + b, 0) / vs.length) }
}

// Scores du 1er tour : par candidat, qui a mis combien. Trié par poids dans le groupe (somme des scores :
// un favori cité par tous passe devant un outsider cité une fois, et un candidat oublié par la plupart descend).
export function tendancesScores(paris) {
  const parCandidat = new Map()
  for (const [player_id, { pari, valeur }] of dernierAvis(paris, 'm2')) {
    for (const [nom, brut] of Object.entries(valeur)) {
      const v = parseFloat(brut)
      if (Number.isNaN(v) || v <= 0) continue
      if (!parCandidat.has(nom)) parCandidat.set(nom, [])
      parCandidat.get(nom).push({ player_id, pari_id: pari.id, v })
    }
  }
  return [...parCandidat.entries()]
    .map(([nom, valeurs]) => ({ nom, valeurs: valeurs.sort((a, b) => b.v - a.v), ...resumeChiffres(valeurs), somme: valeurs.reduce((t, x) => t + x.v, 0) }))
    .sort((a, b) => b.somme - a.somme || b.n - a.n || a.nom.localeCompare(b.nom, 'fr'))
}

// Duels de finalistes, du plus parié au moins parié.
export function tendancesDuels(paris) {
  const duels = new Map()
  for (const [player_id, { valeur }] of dernierAvis(paris, 'm3')) {
    const duo = valeur.filter(Boolean)
    if (duo.length < 2) continue
    const cle = [...duo].sort((a, b) => a.localeCompare(b, 'fr')).join(' | ')
    if (!duels.has(cle)) duels.set(cle, { duo: cle.split(' | '), joueurs: [] })
    duels.get(cle).joueurs.push(player_id)
  }
  return [...duels.values()].sort((a, b) => b.joueurs.length - a.joueurs.length)
}

// Vainqueurs pronostiqués, du plus parié au moins parié.
export function tendancesVainqueurs(paris) {
  const gagnants = new Map()
  for (const [player_id, { valeur }] of dernierAvis(paris, 'm4')) {
    if (!gagnants.has(valeur)) gagnants.set(valeur, [])
    gagnants.get(valeur).push(player_id)
  }
  return [...gagnants.entries()].map(([nom, joueurs]) => ({ nom, joueurs }))
    .sort((a, b) => b.joueurs.length - a.joueurs.length || a.nom.localeCompare(b.nom, 'fr'))
}

// Score du vainqueur au 2nd tour : chacun, plus moyenne et fourchette (null si personne).
export function tendancesScoreFinal(paris) {
  const valeurs = []
  for (const [player_id, { valeur }] of dernierAvis(paris, 'm5')) {
    const v = parseFloat(valeur)
    if (!Number.isNaN(v)) valeurs.push({ player_id, v })
  }
  if (valeurs.length === 0) return null
  return { valeurs: valeurs.sort((a, b) => b.v - a.v), ...resumeChiffres(valeurs) }
}

export const nombreDeJoueurs = (paris, cle) => dernierAvis(paris, cle).size

// Place des points sur une échelle de 0 à `max` (en %), sur 1 à 3 « couloirs » pour que les avatars
// de valeurs voisines ne se superposent pas.
export function placerPoints(valeurs, max, min = 0, ecart = 5) {
  const etendue = max - min || 1
  const dernierParCouloir = []
  return [...valeurs].sort((a, b) => a.v - b.v).map(p => {
    const x = Math.min(100, Math.max(0, ((p.v - min) / etendue) * 100))
    let couloir = 0
    while (couloir < 2 && dernierParCouloir[couloir] != null && x - dernierParCouloir[couloir] < ecart) couloir++
    dernierParCouloir[couloir] = x
    return { ...p, x, couloir }
  })
}

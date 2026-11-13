// Tendances : ce que pronostiquent les gens, agrégé.
// Une personne = un pseudo (insensible à la casse) ; on retient son dernier pronostic qui renseigne le tour,
// pour qu'un changement d'avis ne compte pas double. La liste, elle, montre tous les pronostics.
import { clePseudo, pseudoDe, premierTour, secondTour } from './pronostic'

const parDate = (a, b) => new Date(a.created_at) - new Date(b.created_at) || a.id - b.id
const arrondi = x => Math.round(x * 10) / 10

// Le dernier pronostic de chaque pseudo pour lequel `lire(pari)` renvoie quelque chose.
// Renvoie [{ pari, nom, valeur }].
export function derniersAvis(paris, lire) {
  const avis = new Map()
  for (const pari of [...paris].sort(parDate)) {
    const valeur = lire(pari)
    if (valeur != null) avis.set(clePseudo(pari.pseudo), { pari, nom: pseudoDe(pari), valeur })
  }
  return [...avis.values()]
}

const scoresPremierTour = pari => {
  const l = premierTour(pari).filter(x => x.v != null)
  return l.length ? l : null
}

function resumeChiffres(valeurs) {
  const vs = valeurs.map(x => x.v)
  return { n: vs.length, min: Math.min(...vs), max: Math.max(...vs), moy: arrondi(vs.reduce((a, b) => a + b, 0) / vs.length) }
}

// 1er tour : par candidat, les pourcentages attribués. Trié par poids (somme des pourcentages) :
// un favori cité par tous passe devant un outsider cité une fois.
export function tendancesPremierTour(paris) {
  const avis = derniersAvis(paris, scoresPremierTour)
  const parCandidat = new Map()
  for (const { pari, nom: pseudo, valeur } of avis) {
    for (const { nom, v } of valeur) {
      if (!parCandidat.has(nom)) parCandidat.set(nom, [])
      parCandidat.get(nom).push({ pari_id: pari.id, nom: pseudo, v })
    }
  }
  const candidats = [...parCandidat.entries()]
    .map(([nom, valeurs]) => ({ nom, valeurs: valeurs.sort((a, b) => b.v - a.v), ...resumeChiffres(valeurs), somme: valeurs.reduce((t, x) => t + x.v, 0) }))
    .sort((a, b) => b.somme - a.somme || b.n - a.n || a.nom.localeCompare(b.nom, 'fr'))
  return { personnes: avis.length, candidats }
}

// 2nd tour : duels les plus pronostiqués, vainqueurs, score du vainqueur.
export function tendancesSecondTour(paris) {
  const avis = derniersAvis(paris, secondTour)
  const duels = new Map()
  const vainqueurs = new Map()
  const scores = []
  for (const { pari, nom, valeur: t } of avis) {
    const duo = [t.vainqueur, t.vaincu].sort((a, b) => a.localeCompare(b, 'fr'))
    const cle = duo.join(' | ')
    if (!duels.has(cle)) duels.set(cle, { duo, personnes: [] })
    duels.get(cle).personnes.push({ pari_id: pari.id, nom, vainqueur: t.vainqueur })
    if (!vainqueurs.has(t.vainqueur)) vainqueurs.set(t.vainqueur, [])
    vainqueurs.get(t.vainqueur).push({ pari_id: pari.id, nom })
    if (t.scoreVainqueur != null && !Number.isNaN(t.scoreVainqueur)) scores.push({ pari_id: pari.id, nom: `${nom} · ${t.vainqueur}`, v: t.scoreVainqueur })
  }
  return {
    personnes: avis.length,
    duels: [...duels.values()].sort((a, b) => b.personnes.length - a.personnes.length || a.duo.join().localeCompare(b.duo.join(), 'fr')),
    vainqueurs: [...vainqueurs.entries()].map(([nom, personnes]) => ({ nom, personnes }))
      .sort((a, b) => b.personnes.length - a.personnes.length || a.nom.localeCompare(b.nom, 'fr')),
    scoreVainqueur: scores.length ? { valeurs: scores.sort((a, b) => b.v - a.v), ...resumeChiffres(scores) } : null,
  }
}

// Place des points sur une échelle de `min` à `max` (en %), sur 1 à 3 « couloirs » pour que les avatars
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

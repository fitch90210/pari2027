// Petites aides d'affichage de la nouvelle UI (pas de logique de jeu ici).

// Initiales d'un nom : « Camille » → « C », « Jean-Luc Mélenchon » → « JM ».
export function initiales(nom) {
  const mots = String(nom ?? '').trim().split(/\s+/).filter(Boolean)
  if (mots.length === 0) return '?'
  if (mots.length === 1) return mots[0][0].toUpperCase()
  return (mots[0][0] + mots[mots.length - 1][0]).toUpperCase()
}

// Teinte d'avatar stable (1 à 4) dérivée du nom : un même joueur garde sa couleur.
export function teinteAvatar(nom, nombre = 4) {
  let h = 0
  for (const c of String(nom ?? '')) h = (h * 31 + c.codePointAt(0)) >>> 0
  return (h % nombre) + 1
}

// Jours entiers restants avant une date (0 si passée) : « J-150 ».
export function joursAvant(iso, now = new Date()) {
  const ms = new Date(iso).getTime() - now.getTime()
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000)
}

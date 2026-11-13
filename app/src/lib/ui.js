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

// « À l'instant », « 2 h », « Hier », « 3 nov. » : âge d'un pari pour les listes.
export function depuis(iso, now = new Date()) {
  const min = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000)
  if (min < 1) return 'À l\'instant'
  if (min < 60) return `${min} min`
  if (min < 24 * 60) return `${Math.floor(min / 60)} h`
  if (min < 48 * 60) return 'Hier'
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'Europe/Paris' })
}

// « 13 novembre 2026 à 14:05 » : date complète d'un pronostic (infobulle, lecteurs d'écran).
export function dateComplete(iso) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris',
  })
}

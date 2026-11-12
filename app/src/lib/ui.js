import { bonusAnticipation } from './scoring'

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

// Prochain jour où le bonus d'anticipation baisse d'un point (null s'il est déjà à 0).
// Cherche jour après jour (au plus 32) : plus simple et plus sûr que de dériver la date.
export function prochaineBaisse(periodes, now = new Date()) {
  const courant = bonusAnticipation(now.toISOString(), periodes)
  if (courant === 0) return null
  for (let j = 1; j <= 32; j++) {
    const d = new Date(now.getTime() + j * 86_400_000)
    if (bonusAnticipation(d.toISOString(), periodes) < courant) return d
  }
  return null
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

// « 11 avril » : jour du 1er tour, d'après la fin de la période 3 (veille du scrutin à minuit).
export function jourDuScrutin(periodes) {
  const fin = periodes.find(p => p.id === 3)?.ends_at
  return fin ? new Date(fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Europe/Paris' }) : null
}

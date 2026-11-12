import { initiales, teinteAvatar } from '../lib/ui'
import s from './Avatar.module.css'

// Avatar d'un joueur : initiale sur une teinte pâle dérivée du nom (stable d'un écran à l'autre).
export default function Avatar({ nom, taille = 28, className = '' }) {
  return (
    <span
      className={[s.avatar, s['t' + teinteAvatar(nom)], className].filter(Boolean).join(' ')}
      style={{ width: taille, height: taille, fontSize: Math.round(taille * 0.43) }}
      aria-hidden="true"
    >
      {initiales(nom).slice(0, 1)}
    </span>
  )
}

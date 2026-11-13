import { useState } from 'react'
import { initiales, teinteAvatar } from '../lib/ui'
import s from './Avatar.module.css'

// Avatar : photo si on en a une (et qu'elle se charge), sinon initiales sur une teinte pâle dérivée du nom.
// `lettres` : 1 pour un pseudo, 2 pour un candidat (« JB »).
export default function Avatar({ nom, taille = 28, photo = null, lettres = 1, className = '' }) {
  const [echec, setEchec] = useState(null)
  const avecPhoto = photo && echec !== photo
  return (
    <span
      className={[s.avatar, !avecPhoto && s['t' + teinteAvatar(nom)], avecPhoto && s.photo, className].filter(Boolean).join(' ')}
      style={{ width: taille, height: taille, fontSize: Math.round(taille * (lettres > 1 ? 0.36 : 0.43)) }}
      aria-hidden="true"
    >
      {avecPhoto
        ? <img src={photo} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" className={s.image} onError={() => setEchec(photo)} />
        : initiales(nom).slice(0, lettres)}
    </span>
  )
}

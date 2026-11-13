import Avatar from './Avatar'
import s from './AvatarInfo.module.css'

// Avatar d'un joueur avec une bulle (nom et valeur) au survol, au focus ou au toucher.
// `cote` : 'gauche' ou 'droite' aligne la bulle sur le bord quand l'avatar est près d'un bord d'écran.
export default function AvatarInfo({ nom, valeur, taille = 18, cote }) {
  return (
    <button type="button" className={[s.info, cote && s[cote]].filter(Boolean).join(' ')} aria-label={valeur ? `${nom}, ${valeur}` : nom}>
      <Avatar nom={nom} taille={taille} />
      <span className={s.bulle} aria-hidden="true">{nom}{valeur && <> · <span className={s.valeur}>{valeur}</span></>}</span>
    </button>
  )
}

import { Link } from 'react-router-dom'
import Icone from './Icone'
import s from './Liste.module.css'

// Liste groupée (à placer dans une <Carte liste>) : lignes de 56 px séparées par un filet.
export function Liste({ children, ...props }) {
  return <ul className={s.liste} {...props}>{children}</ul>
}

// Ligne : visuel à gauche, titre et sous-titre, information à droite.
// Avec `to`, la ligne entière est un lien (chevron affiché).
export function Ligne({ debut, titre, sousTitre, fin, to, onClick, multiligne = false }) {
  const interieur = (
    <>
      {debut}
      <span className={s.contenu}>
        <span className={s.textes}>
          <span className={s.titre}>{titre}</span>
          {sousTitre && <span className={[s.sousTitre, multiligne && s.multiligne].filter(Boolean).join(' ')}>{sousTitre}</span>}
        </span>
        {fin != null && <span className={s.fin}>{fin}</span>}
        {(to || onClick) && <Icone nom="chevron" taille={14} epaisseur={2.2} className={s.chevron} />}
      </span>
    </>
  )
  return (
    <li className={s.ligne}>
      {to ? <Link to={to} className={s.lien}>{interieur}</Link>
        : onClick ? <button type="button" onClick={onClick} className={`${s.lien} ${s.bouton}`}>{interieur}</button>
        : <div className={s.statique}>{interieur}</div>}
    </li>
  )
}

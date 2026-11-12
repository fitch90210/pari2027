import s from './EtatVide.module.css'

// État vide, d'erreur ou « bientôt » : un titre, une phrase, éventuellement une action.
export default function EtatVide({ titre, texte, action }) {
  return (
    <div className={s.etat}>
      <h2 className={s.titre}>{titre}</h2>
      {texte && <p className={s.texte}>{texte}</p>}
      {action && <div className={s.action}>{action}</div>}
    </div>
  )
}

import s from './Ecran.module.css'

// Gabarit d'un écran de la nouvelle UI : grand titre (HIG « large title »), surtitre, contenu en colonne.
export default function Ecran({ titre, surtitre, children }) {
  return (
    <main className={s.ecran}>
      <div className={s.colonne}>
        {(titre || surtitre) && (
          <header className={s.entete}>
            {surtitre && <span className={s.surtitre}>{surtitre}</span>}
            {titre && <h1 className={s.titre}>{titre}</h1>}
          </header>
        )}
        {children}
      </div>
    </main>
  )
}

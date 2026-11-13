import { useEffect } from 'react'
import Icone from './Icone'
import Etapes from './Etapes'
import { titreOnglet } from '../lib/marque'
import s from './CadreEtape.module.css'

// Cadre d'une étape : « Retour » (ou « Annuler » à la première), titre de parcours, « n / total »,
// filet de progression, contenu, et pied collant pour l'action principale (HIG : une seule action principale).
export default function CadreEtape({ titreParcours = 'Nouveau pronostic', courante, total, onRetour, retourLibelle, titre, aide, pied, children }) {
  useEffect(() => { document.title = titreOnglet(titre ?? titreParcours) }, [titre, titreParcours])
  return (
    <div className={s.cadre}>
      <div className={s.haut}>
        <button type="button" className={s.gauche} onClick={onRetour}>
          {retourLibelle !== 'Annuler' && <Icone nom="retour" taille={18} epaisseur={2} />}
          {retourLibelle}
        </button>
        <span className={s.centre}>{titreParcours}</span>
        <span className={s.droite}>{courante} / {total}</span>
      </div>
      <Etapes courante={courante} total={total} />
      <main id="contenu" className={s.corps}>
        {titre && <h1 className={s.titre}>{titre}</h1>}
        {aide && <p className={s.aide}>{aide}</p>}
        {children}
      </main>
      {pied && <div className={s.pied}><div className={s.piedInterieur}>{pied}</div></div>}
    </div>
  )
}

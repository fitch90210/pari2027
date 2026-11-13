import { useLocation } from 'react-router-dom'
import BarreOnglets from './BarreOnglets'
import s from './Coque.module.css'

// Coque commune à tous les écrans : le contenu, puis la navigation (en bas sur mobile, en haut sur grand écran).
export default function Coque({ children }) {
  // Dans le parcours Parier, la barre d'onglets s'efface sur mobile (HIG : un parcours concentré, avec son propre pied)
  const enParcours = useLocation().pathname.startsWith('/parier')
  return (
    <>
      <a href="#contenu" className="evitement">Aller au contenu</a>
      <div className={s.contenu}>{children}</div>
      <div className={enParcours ? s.masquerMobile : undefined}><BarreOnglets /></div>
    </>
  )
}

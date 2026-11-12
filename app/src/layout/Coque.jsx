import BarreOnglets from './BarreOnglets'
import s from './Coque.module.css'

// Coque commune à tous les écrans : le contenu, puis la navigation (en bas sur mobile, en haut sur grand écran).
export default function Coque({ children }) {
  return (
    <>
      <div className={s.contenu}>{children}</div>
      <BarreOnglets />
    </>
  )
}

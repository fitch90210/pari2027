import { Link } from 'react-router-dom'
import s from './Pied.module.css'

// Pied de page discret : c'est ici, et nulle part dans la navigation, que se trouve l'accès à l'admin.
export default function Pied() {
  return (
    <footer className={s.pied}>
      <span>Pari 2027 · les pronostics de la présidentielle</span>
      <Link to="/admin">Admin</Link>
    </footer>
  )
}

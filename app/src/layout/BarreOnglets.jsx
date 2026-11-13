import { NavLink, Link } from 'react-router-dom'
import Icone from '../ui/Icone'
import { NOM, EMBLEME } from '../lib/marque'
import s from './BarreOnglets.module.css'

// Trois entrées : l'accueil, l'action (au centre sur mobile) et ce que les autres pronostiquent.
const ONGLETS = [
  { to: '/', label: 'Accueil', icone: 'accueil', fin: true },
  { to: '/pronostiquer', label: 'Pronostiquer', centre: true },
  { to: '/pronostics', label: 'Pronostics', icone: 'paris' },
]

export default function BarreOnglets() {
  return (
    <nav aria-label="Navigation principale" className={s.barre}>
      <Link to="/" className={s.marque}><span className={s.embleme} aria-hidden="true">{EMBLEME}</span>{NOM}</Link>
      <ul className={s.onglets}>
        {ONGLETS.map(o => (
          <li key={o.to} className={o.centre ? s.itemParier : undefined}>
            <NavLink
              to={o.to} end={o.fin}
              className={({ isActive }) => [s.onglet, isActive && s.actif, o.centre && s.ongletParier].filter(Boolean).join(' ')}
            >
              {o.centre
                ? <span className={s.parier}><Icone nom="plus" taille={16} epaisseur={2.6} /></span>
                : <Icone nom={o.icone} className={s.icone} />}
              <span>{o.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

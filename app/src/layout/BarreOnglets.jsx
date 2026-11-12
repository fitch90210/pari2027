import { NavLink, Link } from 'react-router-dom'
import { useGame } from '../store/GameContext'
import { joursAvant } from '../lib/ui'
import Icone from '../ui/Icone'
import Pastille from '../ui/Pastille'
import s from './BarreOnglets.module.css'

const ONGLETS = [
  { to: '/', label: 'Accueil', icone: 'accueil', fin: true },
  { to: '/paris', label: 'Paris', icone: 'paris' },
  { to: '/parier', label: 'Parier', centre: true },
  { to: '/classements', label: 'Classements', icone: 'classements' },
  { to: '/regles', label: 'Règles', icone: 'regles' },
]

export default function BarreOnglets() {
  const { periodeEnCours, periodes } = useGame()
  const premierTour = periodes.find(p => p.id === 3)?.ends_at

  return (
    <nav aria-label="Navigation principale" className={s.barre}>
      <Link to="/" className={s.marque}><span className={s.point} aria-hidden="true" />Pari 2027</Link>
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
      {periodeEnCours && premierTour && (
        <span className={s.pastille}><Pastille>Période {periodeEnCours.id} · J-{joursAvant(premierTour)}</Pastille></span>
      )}
    </nav>
  )
}

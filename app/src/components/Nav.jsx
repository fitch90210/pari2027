import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useGame } from '../store/GameContext'
import { resultatsComplets } from '../lib/pari'

const LINKS = [
  { to: '/', label: 'Accueil', end: true },
  { to: '/pronostics', label: 'Mes paris' },
  { to: '/voir', label: 'Tous les paris' },
  { to: '/classements', label: 'Classements' },
  { to: '/admin', label: 'Admin' },
]

export default function Nav() {
  const { periodeEnCours, results } = useGame()
  // Le mode démo n'apparaît qu'une fois les résultats connus
  const links = resultatsComplets(results)
    ? [...LINKS.slice(0, -1), { to: '/demo', label: 'Mode démo' }, LINKS.at(-1)]
    : LINKS
  const [open, setOpen] = useState(false)
  const location = useLocation()

  // Fermer le menu à chaque changement de route
  useEffect(() => { setOpen(false) }, [location.pathname])

  // Bloquer le scroll du body quand le menu est ouvert
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <NavLink to="/" className="nav-logo">
            Pari<span>2027</span>
          </NavLink>

          {/* Desktop links */}
          <ul className="nav-links nav-links-desktop">
            {links.map(({ to, label, end }) => (
              <li key={to}>
                <NavLink to={to} end={end} className={({ isActive }) => isActive ? 'active' : ''}>
                  <span className="label">{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="nav-right">
            <div className="nav-session">{periodeEnCours ? `P${periodeEnCours.id}` : 'Fermé'}</div>
            {/* Hamburger button — mobile uniquement */}
            <button
              className="nav-hamburger"
              onClick={() => setOpen(o => !o)}
              aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={open}
            >
              <span className={`hamburger-icon ${open ? 'open' : ''}`}>
                <span /><span /><span />
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* Overlay */}
      {open && <div className="nav-overlay" onClick={() => setOpen(false)} />}

      {/* Panel mobile */}
      <div className={`nav-panel ${open ? 'nav-panel-open' : ''}`}>
        <ul className="nav-panel-links">
          {links.map(({ to, label, end }) => (
            <li key={to}>
              <NavLink to={to} end={end} className={({ isActive }) => isActive ? 'active' : ''}>
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="nav-panel-footer">
          <span className="nav-session">{periodeEnCours ? `Période ${periodeEnCours.id} en cours` : 'Jeu fermé'}</span>
        </div>
      </div>
    </>
  )
}

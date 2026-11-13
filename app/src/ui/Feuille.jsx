import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import Icone from './Icone'
import s from './Feuille.module.css'

// Feuille (sheet, HIG) pour les tâches ponctuelles : identification, détail d'un pari, confirmation.
// Monte du bas sur mobile, centrée sur grand écran. Échap ou clic sur le fond pour fermer.
export default function Feuille({ ouverte, onFermer, titre, children }) {
  const titreId = useId()
  const ref = useRef(null)
  // Le parent passe souvent une fonction recréée à chaque rendu : on la garde en référence pour que
  // l'effet ne se relance pas (il volerait le focus du champ en cours de saisie).
  const fermer = useRef(onFermer)
  useEffect(() => { fermer.current = onFermer })

  useEffect(() => {
    if (!ouverte) return
    const avant = document.activeElement
    const scroll = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    const clavier = e => { if (e.key === 'Escape') fermer.current?.() }
    document.addEventListener('keydown', clavier)
    return () => {
      document.body.style.overflow = scroll
      document.removeEventListener('keydown', clavier)
      avant?.focus?.()
    }
  }, [ouverte])

  if (!ouverte) return null
  return createPortal(
    <div className={s.fond} onMouseDown={e => { if (e.target === e.currentTarget) onFermer?.() }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titre ? titreId : undefined} tabIndex={-1} className={s.feuille}>
        <div className={s.poignee} aria-hidden="true" />
        {titre && (
          <div className={s.entete}>
            <h2 id={titreId} className={s.titre}>{titre}</h2>
            <button type="button" className={s.fermer} onClick={onFermer} aria-label="Fermer">
              <Icone nom="fermer" taille={20} epaisseur={2} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}

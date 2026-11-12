import { useRef } from 'react'
import s from './Segmente.module.css'

// Contrôle segmenté (HIG) : choix exclusif entre 2 à 4 vues.
// options : [{ valeur, libelle }]. Flèches gauche/droite pour changer au clavier.
export default function Segmente({ options, valeur, onChange, label, className = '' }) {
  const refs = useRef([])
  const clavier = (e, i) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const j = (i + (e.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length
    onChange(options[j].valeur)
    refs.current[j]?.focus()
  }
  return (
    <div role="radiogroup" aria-label={label} className={[s.segmente, className].filter(Boolean).join(' ')}>
      {options.map((o, i) => {
        const actif = o.valeur === valeur
        return (
          <button
            key={o.valeur}
            ref={el => { refs.current[i] = el }}
            type="button" role="radio" aria-checked={actif} tabIndex={actif ? 0 : -1}
            className={[s.option, actif && s.active].filter(Boolean).join(' ')}
            onClick={() => onChange(o.valeur)}
            onKeyDown={e => clavier(e, i)}
          >
            {o.libelle}
          </button>
        )
      })}
    </div>
  )
}

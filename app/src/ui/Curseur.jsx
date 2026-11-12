import { useId } from 'react'
import s from './Curseur.module.css'

// Curseur de valeur (pourcentages du pari) : libellé et valeur au-dessus, piste fine dessous.
// Champ natif <input type="range"> : clavier, lecteurs d'écran et tactile gérés par le navigateur.
export default function Curseur({ label, valeur, onChange, min = 0, max = 100, pas = 1, format = v => `${v} %`, disabled = false }) {
  const id = useId()
  const pct = max > min ? ((valeur - min) / (max - min)) * 100 : 0
  return (
    <div className={s.curseur}>
      <div className={s.entete}>
        <label htmlFor={id} className={s.label}>{label}</label>
        <output htmlFor={id} className={s.valeur}>{format(valeur)}</output>
      </div>
      <input
        id={id} type="range" className={s.range}
        min={min} max={max} step={pas} value={valeur} disabled={disabled}
        aria-valuetext={format(valeur)}
        style={{ '--pct': `${pct}%` }}
        onChange={e => onChange(Number(e.target.value))}
      />
    </div>
  )
}

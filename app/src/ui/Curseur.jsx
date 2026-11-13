import { useId, useState } from 'react'
import s from './Curseur.module.css'

const arrondi = x => Math.round(x * 10) / 10

// Curseur de valeur (pourcentages du pronostic) : libellé et valeur au-dessus, piste fine dessous.
// Toucher la valeur permet de la saisir au clavier, au dixième près.
export default function Curseur({ label, debut, valeur, onChange, min = 0, max = 100, pas = 1, format = v => `${v} %`, disabled = false }) {
  const id = useId()
  const [saisie, setSaisie] = useState(null) // texte en cours de saisie, ou null
  const pct = max > min ? ((valeur - min) / (max - min)) * 100 : 0

  const valider = () => {
    const n = parseFloat(String(saisie).replace(',', '.'))
    if (!Number.isNaN(n)) onChange(arrondi(Math.min(max, Math.max(min, n))))
    setSaisie(null)
  }

  return (
    <div className={s.curseur}>
      <div className={s.entete}>
        {debut}
        <label htmlFor={id} className={s.label}>{label}</label>
        {saisie === null
          ? (
            <button type="button" className={s.valeur} disabled={disabled}
              onClick={() => setSaisie(String(valeur).replace('.', ','))}
              aria-label={`${format(valeur)}, saisir une valeur pour ${label}`}>
              {format(valeur)}
            </button>
          )
          : (
            <span className={s.saisie}>
              <input
                autoFocus type="text" inputMode="decimal" className={s.champ} value={saisie}
                aria-label={`Pourcentage de ${label}`}
                onChange={e => setSaisie(e.target.value.replace(/[^\d.,]/g, '').slice(0, 5))}
                onBlur={valider}
                onFocus={e => e.target.select()}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); valider() }
                  if (e.key === 'Escape') setSaisie(null)
                }}
              />
              <span className={s.unite}>%</span>
            </span>
          )}
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

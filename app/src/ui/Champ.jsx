import { useId } from 'react'
import s from './Champ.module.css'

// Champ de saisie avec libellé visible, aide et message d'erreur.
// `code` : champ à 4 chiffres (clavier numérique, saisie masquée).
export default function Champ({ label, valeur, onChange, erreur, aide, code = false, className = '', ...props }) {
  const id = useId()
  const messageId = id + '-msg'
  return (
    <div className={s.champ}>
      {label && <label htmlFor={id} className={s.label}>{label}</label>}
      <input
        id={id}
        className={[s.entree, code && s.code, className].filter(Boolean).join(' ')}
        value={valeur}
        onChange={e => onChange(code ? e.target.value.replace(/[^0-9]/g, '') : e.target.value)}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={erreur || aide ? messageId : undefined}
        {...(code ? { type: 'password', inputMode: 'numeric', maxLength: 4, autoComplete: 'off' } : {})}
        {...props}
      />
      {erreur ? <p id={messageId} className={s.erreur} role="alert">{erreur}</p>
        : aide ? <p id={messageId} className={s.aide}>{aide}</p> : null}
    </div>
  )
}

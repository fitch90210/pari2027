import s from './Admin.module.css'

// Message d'état d'un enregistrement : succès ou erreur, annoncé aux lecteurs d'écran.
export default function Retour({ ok, erreur }) {
  if (erreur) return <p className={`${s.retour} ${s.retourErreur}`} role="alert">{erreur}</p>
  if (ok) return <p className={`${s.retour} ${s.retourOk}`} role="status">Enregistré</p>
  return null
}

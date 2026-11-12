import s from './Etapes.module.css'

// Progression d'un parcours en étapes (« 2 / 5 ») : un filet de 2 px qui se remplit.
export default function Etapes({ courante, total }) {
  return (
    <div
      role="progressbar" aria-label={`Étape ${courante} sur ${total}`}
      aria-valuemin={1} aria-valuemax={total} aria-valuenow={courante}
      className={s.etapes}
    >
      <span className={s.rempli} style={{ width: `${(courante / total) * 100}%` }} />
    </div>
  )
}

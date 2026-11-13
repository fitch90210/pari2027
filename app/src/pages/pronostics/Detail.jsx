import { Link } from 'react-router-dom'
import { depuis, dateComplete } from '../../lib/ui'
import { pourcent } from '../../lib/parcours'
import { pseudoDe } from '../../lib/pronostic'
import Avatar from '../../ui/Avatar'
import Icone from '../../ui/Icone'
import s from './Pronostics.module.css'

// Pièces d'affichage d'un pronostic, partagées par la liste et la page d'un pronostic.

// Pseudo et date ; `lien` : le pseudo mène à la page du pronostic.
export function Entete({ pari, maintenant, lien = false }) {
  const contenu = (
    <>
      <Avatar nom={pseudoDe(pari)} taille={28} />
      <span className={s.pseudo}>{pseudoDe(pari)}</span>
      <time className={s.date} dateTime={pari.created_at} title={dateComplete(pari.created_at)}>{depuis(pari.created_at, maintenant)}</time>
      {lien && <Icone nom="chevron" taille={16} className={s.chevron} />}
    </>
  )
  return lien
    ? <Link to={`/pronostics/${pari.id}`} className={[s.entete, s.enteteLien].join(' ')} aria-label={`Pronostic de ${pseudoDe(pari)}`}>{contenu}</Link>
    : <div className={s.entete}>{contenu}</div>
}

export function DetailPremierTour({ candidats }) {
  return (
    <ul className={s.candidats} aria-label="Candidats et pourcentages au 1er tour">
      {candidats.map(c => (
        <li key={c.nom} className={s.candidat}>
          <span className={s.candidatNom}>{c.nom}</span>
          {c.v != null && <span className={s.candidatScore}>{pourcent(c.v)}</span>}
        </li>
      ))}
    </ul>
  )
}

export function DetailSecondTour({ t }) {
  return (
    <div className={s.duel}>
      <div className={s.camp}>
        <span className={s.etiquette}>Vainqueur</span>
        <span className={s.campNom}>{t.vainqueur}</span>
        {t.scoreVainqueur != null && <span className={s.campScore}>{pourcent(t.scoreVainqueur)}</span>}
      </div>
      <div className={[s.camp, s.vaincu].join(' ')}>
        <span className={s.etiquette}>Vaincu</span>
        <span className={s.campNom}>{t.vaincu}</span>
        {t.scoreVaincu != null && <span className={s.campScore}>{pourcent(t.scoreVaincu)}</span>}
      </div>
    </div>
  )
}

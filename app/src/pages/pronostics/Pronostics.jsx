import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useGame } from '../../store/GameContext'
import { depuis, dateComplete } from '../../lib/ui'
import { pourcent } from '../../lib/parcours'
import { pseudoDe, premierTour, secondTour } from '../../lib/pronostic'
import Ecran from '../../ui/Ecran'
import Carte from '../../ui/Carte'
import Avatar from '../../ui/Avatar'
import Bouton from '../../ui/Bouton'
import Segmente from '../../ui/Segmente'
import EtatVide from '../../ui/EtatVide'
import Tendances from './Tendances'
import s from './Pronostics.module.css'

const PAR_PAGE = 20

function Entete({ pari, maintenant }) {
  return (
    <div className={s.entete}>
      <Avatar nom={pseudoDe(pari)} taille={28} />
      <span className={s.pseudo}>{pseudoDe(pari)}</span>
      <time className={s.date} dateTime={pari.created_at} title={dateComplete(pari.created_at)}>{depuis(pari.created_at, maintenant)}</time>
    </div>
  )
}

function DetailPremierTour({ candidats }) {
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

function DetailSecondTour({ t }) {
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

// Tous les pronostics d'un tour, du plus récent au plus ancien.
function Liste({ tour }) {
  const { paris, now } = useGame()
  const [nombre, setNombre] = useState(PAR_PAGE)
  const maintenant = new Date(now)
  const lignes = useMemo(() => paris
    .map(p => ({ pari: p, detail: tour === 1 ? premierTour(p) : secondTour(p) }))
    .filter(l => (tour === 1 ? l.detail.length > 0 : l.detail)), [paris, tour])

  if (lignes.length === 0) return null
  return (
    <section className={s.pile}>
      <h2 className={s.sous}>Tous les pronostics du {tour === 1 ? '1er' : '2nd'} tour, du plus récent au plus ancien</h2>
      <Carte liste>
        <ul className={s.liste}>
          {lignes.slice(0, nombre).map(({ pari, detail }) => (
            <li key={pari.id} className={s.pronostic}>
              <Entete pari={pari} maintenant={maintenant} />
              {tour === 1 ? <DetailPremierTour candidats={detail} /> : <DetailSecondTour t={detail} />}
            </li>
          ))}
        </ul>
      </Carte>
      {lignes.length > nombre && (
        <Bouton variante="secondaire" pleineLargeur onClick={() => setNombre(n => n + PAR_PAGE)}>
          Afficher plus ({lignes.length - nombre} restants)
        </Bouton>
      )}
    </section>
  )
}

// « Pronostics » : un tour à la fois. Les tendances d'abord, puis chaque pronostic.
export default function Pronostics() {
  const { paris } = useGame()
  const vientDePoster = !!useLocation().state?.nouveau
  const [tour, setTour] = useState('1')

  return (
    <Ecran titre="Pronostics">
      {vientDePoster && <p className={s.note}><strong>Ton pronostic est enregistré.</strong> Il est en tête de la liste, sous les tendances.</p>}
      {paris.length === 0
        ? <Carte><EtatVide titre="Aucun pronostic pour l'instant" texte="Sois le premier à donner le tien." action={<Bouton to="/pronostiquer">Pronostiquer</Bouton>} /></Carte>
        : <>
            <Segmente label="Tour" valeur={tour} onChange={setTour}
              options={[{ valeur: '1', libelle: '1er tour' }, { valeur: '2', libelle: '2nd tour' }]} />
            <Tendances key={`t${tour}`} tour={Number(tour)} />
            <Liste key={`l${tour}`} tour={Number(tour)} />
          </>}
    </Ecran>
  )
}

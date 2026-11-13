import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useGame } from '../../store/GameContext'
import { premierTour, secondTour } from '../../lib/pronostic'
import Ecran from '../../ui/Ecran'
import Carte from '../../ui/Carte'
import Bouton from '../../ui/Bouton'
import Segmente from '../../ui/Segmente'
import EtatVide from '../../ui/EtatVide'
import Tendances from './Tendances'
import { Entete, DetailPremierTour, DetailSecondTour } from './Detail'
import s from './Pronostics.module.css'

const PAR_PAGE = 20

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
      <h2 className={s.sous}>{tour === 1 ? 'Tous les pronostics du 1er tour' : 'Tous les duels du 2nd tour'}, du plus récent au plus ancien</h2>
      <Carte liste>
        <ul className={s.liste}>
          {lignes.slice(0, nombre).map(({ pari, detail }) => (
            <li key={pari.id} className={s.pronostic}>
              <Entete pari={pari} maintenant={maintenant} lien />
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

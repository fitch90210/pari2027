import { useParams } from 'react-router-dom'
import { useGame } from '../../store/GameContext'
import { pseudoDe, premierTour, secondTour } from '../../lib/pronostic'
import Ecran from '../../ui/Ecran'
import Carte from '../../ui/Carte'
import Bouton from '../../ui/Bouton'
import EtatVide from '../../ui/EtatVide'
import { Entete, DetailPremierTour, DetailSecondTour } from './Detail'
import s from './Pronostics.module.css'

// /pronostics/:id : un seul pronostic, ses deux tours.
export default function Pronostic() {
  const { id } = useParams()
  const { paris, now } = useGame()
  const pari = paris.find(p => String(p.id) === id)

  if (!pari) {
    return (
      <Ecran titre="Pronostic introuvable">
        <Carte><EtatVide titre="Ce pronostic n'existe pas" texte="Le lien est peut-être ancien." action={<Bouton to="/pronostics">Voir tous les pronostics</Bouton>} /></Carte>
      </Ecran>
    )
  }

  const t1 = premierTour(pari)
  const t2 = secondTour(pari)
  return (
    <Ecran titre={`Pronostic de ${pseudoDe(pari)}`}>
      <Carte>
        <div className={s.pile}>
          <Entete pari={pari} maintenant={new Date(now)} />
          {t1.length > 0 && (
            <section className={s.section}>
              <h2 className={s.titreTour}>1er tour</h2>
              <DetailPremierTour candidats={t1} />
            </section>
          )}
          {t2 && (
            <section className={s.section}>
              <h2 className={s.titreTour}>2nd tour</h2>
              <DetailSecondTour t={t2} />
            </section>
          )}
        </div>
      </Carte>
      <Bouton variante="secondaire" pleineLargeur to="/pronostics">Voir tous les pronostics</Bouton>
    </Ecran>
  )
}

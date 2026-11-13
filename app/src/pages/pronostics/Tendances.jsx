import { useMemo } from 'react'
import { useGame } from '../../store/GameContext'
import { pourcent } from '../../lib/parcours'
import { tendancesPremierTour, tendancesSecondTour, placerPoints } from '../../lib/tendances'
import Carte from '../../ui/Carte'
import AvatarInfo from '../../ui/AvatarInfo'
import EtatVide from '../../ui/EtatVide'
import Visage from '../../ui/Visage'
import s from './Tendances.module.css'

const virgule = x => String(x).replace('.', ',')
const cote = x => (x < 18 ? 'gauche' : x > 82 ? 'droite' : undefined)
const personnes = n => `${n} personne${n > 1 ? 's' : ''}`

// Échelle de `min` à `max` % : un avatar par pronostic (bulle avec le pseudo et la valeur), un trait pour la moyenne.
// Les avatars voisins se répartissent sur 5 couloirs, alternativement au-dessus et au-dessous de la piste.
const COULOIRS = 5
const DECALAGE = [0, -1, 1, -2, 2]
const PAS_COULOIR = 22

function Echelle({ valeurs, moy, min = 0, max }) {
  const points = useMemo(() => placerPoints(valeurs, max, min, 7, COULOIRS), [valeurs, max, min])
  const utilises = Math.max(...points.map(p => p.couloir), 0)
  const demi = Math.max(...DECALAGE.slice(0, utilises + 1).map(Math.abs))
  const hauteur = (2 * demi + 1) * PAS_COULOIR + 14
  const pas = (max - min) / 4
  return (
    <>
      <div className={s.echelle} style={{ height: hauteur }} role="group" aria-label={`Moyenne ${virgule(moy)} %, ${valeurs.length} pronostics`}>
        <div className={s.piste} />
        <div className={s.trait} style={{ left: `${((moy - min) / (max - min)) * 100}%` }} />
        {points.map(p => (
          <span key={p.pari_id} className={s.point} style={{ left: `${p.x}%`, top: `calc(50% + ${DECALAGE[p.couloir] * PAS_COULOIR}px)` }}>
            <AvatarInfo nom={p.nom} valeur={pourcent(p.v)} cote={cote(p.x)} />
          </span>
        ))}
      </div>
      <div className={s.graduations} aria-hidden="true">
        {[0, 1, 2, 3].map(i => <span key={i}>{min + pas * i}</span>)}<span>{max} %</span>
      </div>
    </>
  )
}

function PremierTour() {
  const { paris } = useGame()
  const t = useMemo(() => tendancesPremierTour(paris), [paris])
  if (t.candidats.length === 0) {
    return <Carte><EtatVide titre="Pas encore de pronostic" texte="Les pourcentages du 1er tour apparaîtront ici." /></Carte>
  }
  return (
    <section className={s.pile}>
      <p className={s.sous}>Le dernier pronostic de {personnes(t.personnes)}. Survole un avatar pour voir son pourcentage.</p>
      <Carte liste>
        {t.candidats.map((c, i) => (
          <div key={c.nom} className={s.ligne}>
            <div className={s.tete}>
              <span className={s.rang}>{i + 1}</span>
              <Visage nom={c.nom} taille={32} />
              <span className={s.noms}>
                <span className={s.nom}>{c.nom}</span>
                <span className={s.detail}>Cité {c.n} fois sur {t.personnes} · de {virgule(c.min)} à {virgule(c.max)} %</span>
              </span>
              <span className={s.moyenne}>{virgule(c.moy)}<span className={s.unite}> %</span></span>
            </div>
            <Echelle valeurs={c.valeurs} moy={c.moy} max={100} />
          </div>
        ))}
      </Carte>
    </section>
  )
}

// 2nd tour : le vainqueur le plus pronostiqué (ou les favoris à égalité), avec le score moyen que lui
// donnent ceux qui le voient gagner. La liste des duels suit, dans Pronostics.
function SecondTour() {
  const { paris } = useGame()
  const t = useMemo(() => tendancesSecondTour(paris), [paris])
  if (t.personnes === 0) {
    return <Carte><EtatVide titre="Pas encore de pronostic" texte="Les pronostics du 2nd tour apparaîtront ici." /></Carte>
  }
  return (
    <section className={s.pile}>
      <h2 className={s.sous}>{t.favoris.length > 1 ? 'Les favoris, à égalité' : 'Le favori'}</h2>
      {t.favoris.map(v => (
        <Carte key={v.nom} className={s.favori}>
          <span className={s.favoriTete}><Visage nom={v.nom} taille={44} /><span className={s.favoriNom}>{v.nom}</span></span>
          {v.moy != null && (
            <span className={s.favoriScore}>{virgule(v.moy)}<span className={s.favoriUnite}> %</span></span>
          )}
          <span className={s.detail}>
            Donné vainqueur par {personnes(v.personnes.length)} sur {t.personnes}
            {v.moy != null ? ', avec ce score en moyenne' : ''}
          </span>
          <div className={s.avatars}>
            {v.personnes.map(p => <AvatarInfo key={p.pari_id} nom={p.nom} valeur={p.v != null ? pourcent(p.v) : undefined} taille={24} />)}
          </div>
        </Carte>
      ))}
    </section>
  )
}

// Lecture agrégée : ce que les gens pronostiquent, tour par tour.
export default function Tendances({ tour }) {
  return tour === 1 ? <PremierTour /> : <SecondTour />
}

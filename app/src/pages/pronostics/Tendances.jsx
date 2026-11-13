import { useMemo } from 'react'
import { useGame } from '../../store/GameContext'
import { pourcent } from '../../lib/parcours'
import { tendancesPremierTour, tendancesSecondTour, placerPoints } from '../../lib/tendances'
import Carte from '../../ui/Carte'
import AvatarInfo from '../../ui/AvatarInfo'
import EtatVide from '../../ui/EtatVide'
import s from './Tendances.module.css'

const virgule = x => String(x).replace('.', ',')
const cote = x => (x < 18 ? 'gauche' : x > 82 ? 'droite' : undefined)
const personnes = n => `${n} personne${n > 1 ? 's' : ''}`

// Échelle de `min` à `max` % : un avatar par pronostic (bulle avec le pseudo et la valeur), un trait pour la moyenne.
function Echelle({ valeurs, moy, min = 0, max }) {
  const points = useMemo(() => placerPoints(valeurs, max, min), [valeurs, max, min])
  const pas = (max - min) / 4
  return (
    <>
      <div className={s.echelle} role="group" aria-label={`Moyenne ${virgule(moy)} %, ${valeurs.length} pronostics`}>
        <div className={s.piste} />
        <div className={s.trait} style={{ left: `${((moy - min) / (max - min)) * 100}%` }} />
        {points.map(p => (
          <span key={p.pari_id} className={s.point} style={{ left: `${p.x}%`, top: `${14 + p.couloir * 18}px` }}>
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
  const max = Math.max(40, Math.ceil(Math.max(...t.candidats.map(c => c.max)) / 10) * 10)
  return (
    <section className={s.pile}>
      <p className={s.sous}>Le dernier pronostic de {personnes(t.personnes)}. Survole un avatar pour voir son pourcentage.</p>
      <Carte liste>
        {t.candidats.map((c, i) => (
          <div key={c.nom} className={s.ligne}>
            <div className={s.tete}>
              <span className={s.rang}>{i + 1}</span>
              <span className={s.noms}>
                <span className={s.nom}>{c.nom}</span>
                <span className={s.detail}>Cité {c.n} fois sur {t.personnes} · de {virgule(c.min)} à {virgule(c.max)} %</span>
              </span>
              <span className={s.moyenne}>{virgule(c.moy)}<span className={s.unite}> %</span></span>
            </div>
            <Echelle valeurs={c.valeurs} moy={c.moy} max={max} />
          </div>
        ))}
      </Carte>
    </section>
  )
}

function SecondTour() {
  const { paris } = useGame()
  const t = useMemo(() => tendancesSecondTour(paris), [paris])
  if (t.personnes === 0) {
    return <Carte><EtatVide titre="Pas encore de pronostic" texte="Les pronostics du 2nd tour apparaîtront ici." /></Carte>
  }
  const sv = t.scoreVainqueur
  const minScore = sv ? Math.min(40, Math.floor(sv.min / 10) * 10) : 40
  const maxScore = sv ? Math.max(70, Math.ceil(sv.max / 10) * 10) : 70
  return (
    <div className={s.pile}>
      <p className={s.sous}>Le dernier pronostic de {personnes(t.personnes)}.</p>

      <section className={s.pile}>
        <h2 className={s.sous}>Le vainqueur</h2>
        <Carte liste>
          {t.vainqueurs.map(v => (
            <div key={v.nom} className={s.ligne}>
              <div className={s.tete}>
                <span className={s.noms}><span className={s.nom}>{v.nom}</span><span className={s.detail}>{v.personnes.length} sur {t.personnes}</span></span>
                <span className={s.moyenne}>{Math.round((v.personnes.length / t.personnes) * 100)}<span className={s.unite}> %</span></span>
              </div>
              <div className={s.barre}><div className={s.barrePleine} style={{ width: `${(v.personnes.length / t.personnes) * 100}%` }} /></div>
              <div className={s.avatars}>{v.personnes.map(p => <AvatarInfo key={p.pari_id} nom={p.nom} taille={24} />)}</div>
            </div>
          ))}
        </Carte>
      </section>

      <section className={s.pile}>
        <h2 className={s.sous}>Les duels</h2>
        <Carte liste>
          {t.duels.map(d => (
            <div key={d.duo.join()} className={s.ligne}>
              <div className={s.tete}>
                <span className={s.noms}><span className={s.nom}>{d.duo.join(' contre ')}</span></span>
                <span className={s.detail}>{personnes(d.personnes.length)}</span>
              </div>
              <div className={s.avatars}>
                {d.personnes.map(p => <AvatarInfo key={p.pari_id} nom={p.nom} valeur={`${p.vainqueur} gagne`} taille={24} />)}
              </div>
            </div>
          ))}
        </Carte>
      </section>

      {sv && (
        <section className={s.pile}>
          <h2 className={s.sous}>Score du vainqueur</h2>
          <Carte liste>
            <div className={s.ligne}>
              <div className={s.tete}>
                <span className={s.noms}><span className={s.nom}>En moyenne</span><span className={s.detail}>de {virgule(sv.min)} à {virgule(sv.max)} % · {sv.n} pronostics</span></span>
                <span className={s.moyenne}>{virgule(sv.moy)}<span className={s.unite}> %</span></span>
              </div>
              <Echelle valeurs={sv.valeurs} moy={sv.moy} min={minScore} max={maxScore} />
            </div>
          </Carte>
        </section>
      )}
    </div>
  )
}

// Lecture agrégée : ce que les gens pronostiquent, tour par tour.
export default function Tendances({ tour }) {
  return tour === 1 ? <PremierTour /> : <SecondTour />
}

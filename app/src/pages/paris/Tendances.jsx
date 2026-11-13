import { useMemo } from 'react'
import { useGame } from '../../store/GameContext'
import { pourcent } from '../../lib/parcours'
import {
  tendancesScores, tendancesDuels, tendancesVainqueurs, tendancesScoreFinal, nombreDeJoueurs, placerPoints,
} from '../../lib/tendances'
import Carte from '../../ui/Carte'
import AvatarInfo from '../../ui/AvatarInfo'
import EtatVide from '../../ui/EtatVide'
import s from './Tendances.module.css'

const virgule = x => String(x).replace('.', ',')
const cote = x => (x < 18 ? 'gauche' : x > 82 ? 'droite' : undefined)

// Échelle de 0 à `max` % : un avatar par pari (bulle avec le nom et la valeur), un trait pour la moyenne.
function Echelle({ valeurs, moy, max, nomDe, format = pourcent }) {
  const points = useMemo(() => placerPoints(valeurs, max), [valeurs, max])
  return (
    <>
      <div className={s.echelle} role="group" aria-label={`Moyenne ${virgule(moy)} %, ${valeurs.length} paris`}>
        <div className={s.piste} />
        <div className={s.trait} style={{ left: `${(moy / max) * 100}%` }} />
        {points.map(p => (
          <span key={p.player_id} className={s.point} style={{ left: `${p.x}%`, top: `${14 + p.couloir * 18}px` }}>
            <AvatarInfo nom={nomDe(p.player_id)} valeur={format(p.v)} cote={cote(p.x)} />
          </span>
        ))}
      </div>
      <div className={s.graduations} aria-hidden="true">
        <span>0</span><span>{max / 4}</span><span>{max / 2}</span><span>{(max * 3) / 4}</span><span>{max} %</span>
      </div>
    </>
  )
}

function LigneCandidat({ c, rang, total, max, nomDe }) {
  return (
    <div className={s.ligne}>
      <div className={s.tete}>
        <span className={s.rang}>{rang}</span>
        <span className={s.noms}>
          <span className={s.nom}>{c.nom}</span>
          <span className={s.detail}>{c.n}/{total} · de {virgule(c.min)} à {virgule(c.max)} %</span>
        </span>
        <span className={s.moyenne}>{virgule(c.moy)}<span className={s.unite}> %</span></span>
      </div>
      <Echelle valeurs={c.valeurs} moy={c.moy} max={max} nomDe={nomDe} />
    </div>
  )
}

// Lecture agrégée du groupe : l'avis actuel de chaque joueur, candidat par candidat (1er tour), puis le 2nd tour.
// Les valeurs de chacun s'affichent au survol (ou au toucher) de son avatar.
export default function Tendances({ tour }) {
  const { players, paris } = useGame()
  const nomDe = id => players.find(p => p.id === id)?.name ?? '?'

  const scores = useMemo(() => tendancesScores(paris), [paris])
  const duels = useMemo(() => tendancesDuels(paris), [paris])
  const vainqueurs = useMemo(() => tendancesVainqueurs(paris), [paris])
  const final = useMemo(() => tendancesScoreFinal(paris), [paris])

  if (tour === 1) {
    const total = nombreDeJoueurs(paris, 'm2')
    if (scores.length === 0) return <Carte><EtatVide titre="Pas encore de scores" texte="Les scores du 1er tour apparaîtront dès qu'un pari en contiendra." /></Carte>
    const max = Math.max(40, Math.ceil(Math.max(...scores.map(c => c.max)) / 10) * 10)
    return (
      <div className={s.pile}>
        <p className={s.sous}>L'avis actuel de {total} joueur{total > 1 ? 's' : ''}. Survole un avatar pour voir son score.</p>
        <Carte liste>
          {scores.map((c, i) => <LigneCandidat key={c.nom} c={c} rang={i + 1} total={total} max={max} nomDe={nomDe} />)}
        </Carte>
      </div>
    )
  }

  const nVainqueur = vainqueurs.reduce((a, v) => a + v.joueurs.length, 0)
  const rien = duels.length === 0 && vainqueurs.length === 0 && !final
  if (rien) return <Carte><EtatVide titre="Pas encore de pronostics" texte="Le 2nd tour apparaîtra dès qu'un pari en contiendra." /></Carte>

  return (
    <div className={s.pile}>
      {duels.length > 0 && (
        <section className={s.pile}>
          <h2 className={s.sous}>Duels de finalistes les plus pariés</h2>
          <Carte liste>
            {duels.slice(0, 5).map(d => (
              <div key={d.duo.join()} className={s.ligne}>
                <div className={s.tete}>
                  <span className={s.noms}><span className={s.nom}>{d.duo.join(' – ')}</span></span>
                  <span className={s.detail}>{d.joueurs.length} joueur{d.joueurs.length > 1 ? 's' : ''}</span>
                </div>
                <div className={s.avatars}>{d.joueurs.map(id => <AvatarInfo key={id} nom={nomDe(id)} taille={24} />)}</div>
              </div>
            ))}
          </Carte>
        </section>
      )}

      {vainqueurs.length > 0 && (
        <section className={s.pile}>
          <h2 className={s.sous}>Le vainqueur</h2>
          <Carte liste>
            {vainqueurs.map(v => (
              <div key={v.nom} className={s.ligne}>
                <div className={[s.tete, s.statique].join(' ')}>
                  <span className={s.noms}><span className={s.nom}>{v.nom}</span><span className={s.detail}>{v.joueurs.length}/{nVainqueur}</span></span>
                  <span className={s.moyenne}>{Math.round((v.joueurs.length / nVainqueur) * 100)}<span className={s.unite}> %</span></span>
                </div>
                <div className={s.barre}><div className={s.barrePleine} style={{ width: `${(v.joueurs.length / nVainqueur) * 100}%` }} /></div>
                <div className={s.avatars}>{v.joueurs.map(id => <AvatarInfo key={id} nom={nomDe(id)} taille={24} />)}</div>
              </div>
            ))}
          </Carte>
        </section>
      )}

      {final && (
        <section className={s.pile}>
          <h2 className={s.sous}>Score du vainqueur</h2>
          <Carte liste>
            <div className={s.ligne}>
              <div className={[s.tete, s.statique].join(' ')}>
                <span className={s.noms}><span className={s.nom}>Moyenne du groupe</span><span className={s.detail}>de {virgule(final.min)} à {virgule(final.max)} % · {final.n} paris</span></span>
                <span className={s.moyenne}>{virgule(final.moy)}<span className={s.unite}> %</span></span>
              </div>
              <Echelle valeurs={final.valeurs} moy={final.moy} max={100} nomDe={nomDe} />
            </div>
          </Carte>
        </section>
      )}
    </div>
  )
}

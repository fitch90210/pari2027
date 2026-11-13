import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useGame } from '../../store/GameContext'
import { pourcent } from '../../lib/parcours'
import {
  tendancesScores, tendancesDuels, tendancesVainqueurs, tendancesScoreFinal, nombreDeJoueurs, placerPoints,
} from '../../lib/tendances'
import Carte from '../../ui/Carte'
import Avatar from '../../ui/Avatar'
import EtatVide from '../../ui/EtatVide'
import { Liste, Ligne } from '../../ui/Liste'
import s from './Tendances.module.css'

const virgule = x => String(x).replace('.', ',')

function Echelle({ valeurs, moy, max, nomDe }) {
  const points = useMemo(() => placerPoints(valeurs, max), [valeurs, max])
  return (
    <>
      <div className={s.echelle} role="img" aria-label={`Moyenne ${virgule(moy)} %, ${valeurs.length} paris`}>
        <div className={s.piste} />
        <div className={s.trait} style={{ left: `${(moy / max) * 100}%` }} />
        {points.map(p => (
          <span key={p.player_id} className={s.point} style={{ left: `${p.x}%`, top: `${14 + p.couloir * 18}px` }}>
            <Avatar nom={nomDe(p.player_id)} taille={18} />
          </span>
        ))}
      </div>
      <div className={s.graduations} aria-hidden="true">
        <span>0</span><span>{max / 4}</span><span>{max / 2}</span><span>{(max * 3) / 4}</span><span>{max} %</span>
      </div>
    </>
  )
}

function LigneCandidat({ c, rang, total, max, nomDe, ouvert, onBascule }) {
  return (
    <div className={s.ligne}>
      <button type="button" className={s.tete} onClick={onBascule} aria-expanded={ouvert}>
        <span className={s.rang}>{rang}</span>
        <span className={s.noms}>
          <span className={s.nom}>{c.nom}</span>
          <span className={s.detail}>{c.n}/{total} · de {virgule(c.min)} à {virgule(c.max)} %</span>
        </span>
        <span className={s.moyenne}>{virgule(c.moy)}<span className={s.unite}> %</span></span>
      </button>
      <Echelle valeurs={c.valeurs} moy={c.moy} max={max} nomDe={nomDe} />
      {ouvert && (
        <div className={s.joueurs}>
          {c.valeurs.map(v => (
            <Link key={v.player_id} to={`/joueurs/${v.player_id}`} className={s.joueur}>
              <Avatar nom={nomDe(v.player_id)} taille={22} />
              <span className={s.joueurNom}>{nomDe(v.player_id)}</span>
              <span className={s.joueurValeur}>{pourcent(v.v)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// Lecture agrégée du groupe : l'avis actuel de chaque joueur, candidat par candidat (1er tour), puis le 2nd tour.
export default function Tendances({ tour }) {
  const { players, paris } = useGame()
  const nomDe = id => players.find(p => p.id === id)?.name ?? '?'
  const [ouverts, setOuverts] = useState(() => new Set())
  const bascule = nom => setOuverts(o => { const n = new Set(o); if (n.has(nom)) n.delete(nom); else n.add(nom); return n })

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
        <p className={s.sous}>L'avis actuel de {total} joueur{total > 1 ? 's' : ''}. Touche un candidat pour voir qui a mis quoi.</p>
        <Carte liste>
          {scores.map((c, i) => (
            <LigneCandidat key={c.nom} c={c} rang={i + 1} total={total} max={max} nomDe={nomDe}
              ouvert={ouverts.has(c.nom) || (i === 0 && ouverts.size === 0)} onBascule={() => bascule(c.nom)} />
          ))}
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
            <Liste>
              {duels.slice(0, 5).map(d => (
                <Ligne key={d.duo.join()} titre={d.duo.join(' – ')} fin={`${d.joueurs.length} joueur${d.joueurs.length > 1 ? 's' : ''}`}
                  sousTitre={d.joueurs.map(nomDe).join(', ')} multiligne />
              ))}
            </Liste>
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
                <div className={s.avatars}>{v.joueurs.map(id => <Link key={id} to={`/joueurs/${id}`} aria-label={nomDe(id)}><Avatar nom={nomDe(id)} taille={24} /></Link>)}</div>
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

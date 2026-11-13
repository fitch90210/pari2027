import { useMemo, useState } from 'react'
import { useGame } from '../store/GameContext'
import { classementGeneral, bonusAnticipation } from '../lib/scoring'
import { depuis } from '../lib/ui'
import Ecran from '../ui/Ecran'
import Carte from '../ui/Carte'
import Bouton from '../ui/Bouton'
import Avatar from '../ui/Avatar'
import Feuille from '../ui/Feuille'
import { Liste, Ligne } from '../ui/Liste'
import DetailPari from './paris/DetailPari'
import s from './Classement.module.css'

// Classement général : une ligne par pari (barème de sa période + bonus d'anticipation).
// Avant les résultats : les paris déjà posés avec leur bonus acquis.
export default function Classement() {
  const { players, paris, periodes, results, now } = useGame()
  const [ouvert, setOuvert] = useState(null)
  const nomDe = id => players.find(p => p.id === id)?.name ?? 'Un joueur'
  const maintenant = new Date(now)

  const classement = useMemo(() => (results ? classementGeneral(paris, periodes, results) : []), [paris, periodes, results])
  const parBonus = useMemo(() => [...paris]
    .map(p => ({ pari: p, bonus: bonusAnticipation(p.created_at, periodes) }))
    .sort((a, b) => b.bonus - a.bonus || new Date(a.pari.created_at) - new Date(b.pari.created_at) || a.pari.id - b.pari.id),
  [paris, periodes])

  return (
    <Ecran titre="Classement" surtitre={results ? 'Classement général des paris' : 'En attente des résultats'}>
      {!results && (
        <>
          <Carte>
            <p className={s.texte}>
              Le classement s'établira quand les résultats officiels seront connus. Chaque pari sera scoré avec le barème,
              plus son bonus d'anticipation : un point par mois d'avance sur le 1er tour. Voici les paris déjà posés et le bonus qu'ils ont acquis.
            </p>
          </Carte>
          <section className={s.pile}>
            <h2 className={s.titreSection}>Bonus acquis</h2>
            <Carte liste>
              <Liste>
                {parBonus.map(({ pari, bonus }) => (
                  <Ligne key={pari.id} debut={<Avatar nom={nomDe(pari.player_id)} taille={32} />} titre={nomDe(pari.player_id)}
                    sousTitre={`P${pari.periode} · ${depuis(pari.created_at, maintenant)}`}
                    fin={<span className={s.bonus}>+{bonus}</span>} onClick={() => setOuvert(pari)} />
                ))}
              </Liste>
            </Carte>
          </section>
          <Bouton variante="secondaire" to="/regles" pleineLargeur>Voir les règles</Bouton>
        </>
      )}

      {results && classement.length > 0 && (
        <>
          <div className={s.podium}>
            {[classement[1], classement[0], classement[2]].filter(Boolean).map(e => (
              <button key={e.pari.id} type="button" className={[s.marche, e.rank === 1 && s.premier].filter(Boolean).join(' ')} onClick={() => setOuvert(e.pari)}>
                <span className={s.rang}>{e.rank}</span>
                <Avatar nom={nomDe(e.player_id)} taille={e.rank === 1 ? 40 : 32} />
                <span className={s.nom}>{nomDe(e.player_id)}</span>
                <span className={s.pts}>{e.scores.total}<span className={s.unite}> pts</span></span>
              </button>
            ))}
          </div>

          <Carte liste>
            <Liste>
              {classement.slice(3).map(e => (
                <Ligne key={e.pari.id} debut={<><span className={s.rangListe}>{e.rank}</span><Avatar nom={nomDe(e.player_id)} taille={28} /></>}
                  titre={nomDe(e.player_id)}
                  sousTitre={`P${e.pari.periode} · ${e.scores.bareme} + ${e.scores.bonus} bonus`}
                  fin={`${e.scores.total} pts`} onClick={() => setOuvert(e.pari)} />
              ))}
            </Liste>
          </Carte>
          <p className={s.texte}>Départage : le meilleur score au pronostic 2, puis le pari le plus ancien.</p>
        </>
      )}

      <Feuille ouverte={!!ouvert} onFermer={() => setOuvert(null)} titre="Pari">
        {ouvert && <DetailPari pari={ouvert} />}
      </Feuille>
    </Ecran>
  )
}

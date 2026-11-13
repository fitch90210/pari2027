import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useGame } from '../store/GameContext'
import { bonusAnticipation } from '../lib/scoring'
import { detailPari } from '../lib/detailPari'
import { depuis } from '../lib/ui'
import Ecran from '../ui/Ecran'
import Carte from '../ui/Carte'
import Bouton from '../ui/Bouton'
import Avatar from '../ui/Avatar'
import Pastille from '../ui/Pastille'
import Feuille from '../ui/Feuille'
import EtatVide from '../ui/EtatVide'
import DetailPari from './paris/DetailPari'
import s from './Profil.module.css'

const jour = iso => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' })

// Profil d'un joueur : ses paris en frise, du plus récent au plus ancien, chacun avec son bonus acquis (et ses points une fois les résultats connus).
export default function Profil() {
  const { id } = useParams()
  const { players, paris, periodes, results, now } = useGame()
  const [ouvert, setOuvert] = useState(null)

  const joueur = players.find(p => p.id === id)
  if (!joueur) {
    return <Ecran titre="Joueur introuvable"><Carte><EtatVide titre="Ce joueur n'existe pas" action={<Bouton to="/paris">Voir les paris</Bouton>} /></Carte></Ecran>
  }

  const siens = paris.filter(p => p.player_id === joueur.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at) || b.id - a.id)
  const maintenant = new Date(now)

  return (
    <Ecran>
      <div className={s.tete}>
        <Avatar nom={joueur.name} taille={48} />
        <h1 className={s.nom}>{joueur.name}</h1>
      </div>

      <div className={s.stats}>
        <Pastille>{siens.length} pari{siens.length > 1 ? 's' : ''}</Pastille>
        {siens[0] && <Pastille>Dernier pari {depuis(siens[0].created_at, maintenant).toLowerCase()}</Pastille>}
      </div>

      <Bouton to="/parier" pleineLargeur>Parier</Bouton>

      <section className={s.pile}>
        <h2 className={s.titreSection}>Historique</h2>
        {siens.length === 0
          ? <Carte><EtatVide titre="Aucun pari" texte={`${joueur.name} n'a pas encore parié.`} /></Carte>
          : (
            <ol className={s.rail}>
              {siens.map((p, i) => {
                const periode = periodes.find(x => x.id === p.periode)
                const d = detailPari(p, periode, results, periodes)
                return (
                  <li key={p.id} className={[s.etape, i === 0 && s.etapeRecente].filter(Boolean).join(' ')}>
                    <span className={s.dot} aria-hidden="true" />
                    <button type="button" className={s.carteBouton} onClick={() => setOuvert(p)}>
                      <span className={s.ligneHaut}>
                        <span className={s.date}>{jour(p.created_at)}</span>
                        <span className={s.bonus}>{d.total != null ? `${d.total} pts` : `+${bonusAnticipation(p.created_at, periodes)} bonus`}</span>
                      </span>
                      <span className={s.ligneHaut}>
                        <span className={s.resume}>P{p.periode}{p.m4 ? ` · Vainqueur : ${p.m4}` : ''}</span>
                        {i === 0 && <Pastille>Dernier</Pastille>}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          )}
      </section>

      <Feuille ouverte={!!ouvert} onFermer={() => setOuvert(null)} titre="Pari">
        {ouvert && <DetailPari pari={ouvert} />}
      </Feuille>
    </Ecran>
  )
}

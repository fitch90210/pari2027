import { Link } from 'react-router-dom'
import { useGame } from '../../store/GameContext'
import { detailPari } from '../../lib/detailPari'
import { depuis } from '../../lib/ui'
import Avatar from '../../ui/Avatar'
import Pastille from '../../ui/Pastille'
import Bouton from '../../ui/Bouton'
import s from './DetailPari.module.css'

const FENETRE_MS = 24 * 3600 * 1000

// Contenu d'une feuille : un pari en entier (pronostics, points si les résultats sont connus, bonus acquis).
export default function DetailPari({ pari }) {
  const { players, periodes, periodeEnCours, results, now } = useGame()
  const periode = periodes.find(p => p.id === pari.periode)
  const joueur = players.find(p => p.id === pari.player_id)
  const d = detailPari(pari, periode, results, periodes)
  const modifiable = periodeEnCours?.id === pari.periode && new Date(pari.created_at).getTime() > now - FENETRE_MS

  return (
    <div className={s.pile}>
      <div className={s.entete}>
        <Avatar nom={joueur?.name ?? '?'} taille={36} />
        <span className={s.qui}>
          <Link to={`/joueurs/${pari.player_id}`} className={s.nom}>{joueur?.name ?? 'Un joueur'}</Link>
          <span className={s.quand}>
            {new Date(pari.created_at).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}
            {' · '}{depuis(pari.created_at, new Date(now))}
          </span>
        </span>
        <Pastille>Période {pari.periode}</Pastille>
      </div>

      <div className={s.lignes}>
        {d.lignes.map(l => (
          <div key={l.cle} className={s.ligne}>
            <span className={s.corps}>
              <span className={s.titre}>{l.titre}</span>
              <span className={[s.valeur, !l.valeur && s.vide].filter(Boolean).join(' ')}>{l.valeur ?? 'Non renseigné'}</span>
            </span>
            {l.points != null && <span className={[s.points, l.points > 0 && s.gagne].filter(Boolean).join(' ')}>+{l.points}</span>}
          </div>
        ))}
      </div>

      <div className={s.total}>
        {d.total != null && <span className={s.totalLigne}><span>Barème</span><span>{d.bareme} pts</span></span>}
        <span className={s.totalLigne}><span>Bonus d'anticipation</span><span>+{d.bonus} pts</span></span>
        {d.total != null && <span className={`${s.totalLigne} ${s.totalFin}`}><span>Total</span><span>{d.total} pts</span></span>}
      </div>

      {modifiable && (
        <div className={s.actions}>
          <Bouton variante="secondaire" to={`/parier/${pari.id}`}>Corriger ce pari</Bouton>
        </div>
      )}
    </div>
  )
}

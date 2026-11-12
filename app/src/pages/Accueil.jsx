import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useGame } from '../store/GameContext'
import { bonusAnticipation } from '../lib/scoring'
import { resultatsComplets } from '../lib/pari'
import { joursAvant, prochaineBaisse, depuis, jourDuScrutin } from '../lib/ui'
import Ecran from '../ui/Ecran'
import Carte from '../ui/Carte'
import Bouton from '../ui/Bouton'
import Pastille from '../ui/Pastille'
import Avatar from '../ui/Avatar'
import Pied from '../ui/Pied'
import { Liste, Ligne } from '../ui/Liste'
import s from './Accueil.module.css'

const ETAPES = [
  { titre: 'Tu fais cinq pronostics', texte: 'Candidats, scores du 1er tour, finalistes, vainqueur, score final.' },
  { titre: 'Chaque pari est scoré', texte: 'Parie autant que tu veux : plus tôt tu paries, plus ton pari rapporte.' },
  { titre: 'Tout est visible', texte: 'Les paris de chacun sont publics, tout le temps.' },
]

const jourCourt = d => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Europe/Paris' })

export default function Accueil() {
  const { players, paris, periodes, periodeEnCours, results, now } = useGame()
  const maintenant = useMemo(() => new Date(now), [now])

  const premierTour = periodes.find(p => p.id === 3)?.ends_at
  const bonus = bonusAnticipation(maintenant.toISOString(), periodes)
  const baisse = prochaineBaisse(periodes, maintenant)
  const scrutin = jourDuScrutin(periodes)
  const ferme = !periodeEnCours
  const termine = resultatsComplets(results)

  const nomDe = id => players.find(p => p.id === id)?.name ?? 'Un joueur'
  const derniers = [...paris].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 4)

  return (
    <Ecran>
      <div className={s.marque}>
        <span className={s.nom}><span className={s.point} aria-hidden="true" />Pari 2027</span>
        {periodeEnCours && premierTour && <Pastille>Période {periodeEnCours.id} · J-{joursAvant(premierTour, maintenant)}</Pastille>}
      </div>

      <Carte surface className={s.banniere}>
        {scrutin && <span className={s.surtitre}>Présidentielle 2027 · 1er tour le {scrutin}</span>}
        <h1 className={s.titre}>{termine ? 'Le verdict est tombé' : 'Qui gagnera la présidentielle ?'}</h1>
        <p className={s.texte}>
          {termine
            ? 'Les résultats sont connus. Regarde le classement, ou refais le match : que serait-il arrivé si tu avais parié ?'
            : ferme
              ? 'Le jeu est fermé : plus aucun pari n\'est possible. Les classements sont figés.'
              : 'Cinq pronostics, un classement entre amis. Chaque pari compte, et plus tu paries tôt, plus il rapporte.'}
        </p>
        <div className={s.actions}>
          {termine
            ? <>
                <Bouton to="/classements">Classement</Bouton>
                <Bouton variante="secondaire" to="/demo">Et si tu avais parié ?</Bouton>
              </>
            : <>
                {!ferme && <Bouton to="/parier">Parier</Bouton>}
                <Bouton variante={ferme ? 'principal' : 'secondaire'} to="/regles">Les règles</Bouton>
              </>}
        </div>
      </Carte>

      {!termine && !ferme && (
        <Carte className={s.bonus}>
          <div className={s.bonusLigne}>
            <span className={[s.chiffre, bonus === 0 && s.chiffreNul].filter(Boolean).join(' ')}>+{bonus}</span>
            <span className={s.bonusTextes}>
              <span className={s.bonusTitre}>
                {bonus > 0 ? 'points d\'avance si tu paries aujourd\'hui' : 'Plus de bonus d\'anticipation'}
              </span>
              <span className={s.bonusSous}>
                {baisse ? `Plus que +${bonus - 1} à partir du ${jourCourt(baisse)}` : 'Le bonus est épuisé : il ne reste que le barème.'}
              </span>
            </span>
          </div>
          <div className={s.frise} aria-hidden="true">
            {Array.from({ length: 12 }, (_, i) => (
              <span key={i} className={[s.mois, i >= 12 - Math.min(bonus, 12) && s.moisActif].filter(Boolean).join(' ')} />
            ))}
          </div>
        </Carte>
      )}

      <section className={s.rubrique}>
        <div className={s.rubriqueEntete}><h2 className={s.rubriqueTitre}>Comment ça marche</h2></div>
        <Carte liste>
          <Liste>
            {ETAPES.map((e, i) => (
              <Ligne key={e.titre} debut={<span className={s.numero}>{i + 1}</span>} titre={e.titre} sousTitre={e.texte} multiligne />
            ))}
          </Liste>
        </Carte>
      </section>

      <section className={s.rubrique}>
        <div className={s.rubriqueEntete}>
          <h2 className={s.rubriqueTitre}>Derniers paris</h2>
          <Link to="/paris" className={s.lienDiscret}>Tout voir</Link>
        </div>
        <Carte liste>
          {derniers.length === 0
            ? <Liste><Ligne titre="Aucun pari pour l'instant" sousTitre="Sois le premier à parier." /></Liste>
            : <Liste>
                {derniers.map(p => (
                  <Ligne
                    key={p.id}
                    to={`/joueurs/${p.player_id}`}
                    debut={<Avatar nom={nomDe(p.player_id)} taille={28} />}
                    titre={nomDe(p.player_id)}
                    sousTitre={p.m4 ? `Vainqueur : ${p.m4}` : 'Pari posé'}
                    fin={depuis(p.created_at, maintenant)}
                  />
                ))}
              </Liste>}
        </Carte>
      </section>

      <Pied />
    </Ecran>
  )
}

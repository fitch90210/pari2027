import { useGame } from '../store/GameContext'
import Ecran from '../ui/Ecran'
import Carte from '../ui/Carte'
import Bouton from '../ui/Bouton'
import Pastille from '../ui/Pastille'
import Pied from '../ui/Pied'
import s from './Regles.module.css'

const PRONOSTICS = [
  { titre: 'Candidats au 1er tour', pts: '+2 pts par candidat correct, +3 pts si tu as le bon nombre total', texte: 'Liste tous les candidats que tu prédis présents au premier tour.' },
  { titre: 'Scores du 1er tour', pts: '+2 pts par candidat dont le score est à ± 2 points du résultat', texte: 'Attribue un pourcentage à chaque candidat de ta liste. La somme doit faire 100 %.' },
  { titre: 'Les deux finalistes', pts: '+8 pts si les deux sont corrects, +3 pts si un seul', texte: 'Désigne les deux candidats qualifiés pour le second tour.' },
  { titre: 'Vainqueur de l\'élection', pts: '+6 pts', texte: 'Qui remportera le second tour ?' },
  { titre: 'Score du second tour', pts: '+2 pts si ton score est à ± 2 points du résultat', texte: 'Estime le score du vainqueur au second tour.' },
]

// Ce que chaque période change (les noms et les dates viennent de la base)
const PERIODES_DESC = {
  1: 'Les cinq pronostics.',
  2: 'Les cinq pronostics.',
  3: 'La liste officielle des candidats est connue : pronostics 2 à 5, sur les candidats officiels.',
  4: 'Les deux finalistes sont connus : le vainqueur et son score.',
}

const fmtJour = iso => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' })

export default function Regles() {
  const { periodes, periodeEnCours } = useGame()

  return (
    <Ecran titre="Règles" surtitre="Comment fonctionne le jeu">
      <p className={s.intro}>
        Tu pronostiques la présidentielle 2027 en cinq paris, autant de fois que tu veux. Chaque pari est daté,
        modifiable pendant 24 h, puis figé. Tous les paris sont visibles, en permanence.
      </p>

      <section className={s.section}>
        <h2 className={s.titreSection}>Les cinq pronostics</h2>
        <Carte liste>
          <ol className={s.liste}>
            {PRONOSTICS.map((p, i) => (
              <li key={p.titre} className={[s.item, i > 0 && s.separe].filter(Boolean).join(' ')}>
                <span className={s.numero}>{i + 1}</span>
                <span className={s.colonne}>
                  <span className={s.ligneTitre}>{p.titre}</span>
                  <span className={s.ligneSous}>{p.texte}</span>
                  <span className={[s.ligneSous, s.points].join(' ')}>{p.pts}</span>
                </span>
              </li>
            ))}
          </ol>
        </Carte>
      </section>

      <section className={s.section}>
        <h2 className={s.titreSection}>Le bonus d'anticipation</h2>
        <Carte>
          <div className={[s.ligneTexte, s.sansMarge].join(' ')}>
            <span className={s.ligneTitre}>+1 point par mois d'avance</span>
            <span className={s.ligneSous}>
              Chaque pari est scoré avec le barème ci-dessus, puis reçoit un point par mois entier qui le sépare de la veille
              du 1er tour. Un pari posé un an avant gagne environ 12 points ; un pari posé la veille, aucun.
              Chaque pari est scoré indépendamment, et tous figurent au classement.
            </span>
          </div>
        </Carte>
      </section>

      <section className={s.section}>
        <h2 className={s.titreSection}>Les périodes</h2>
        <p className={s.intro}>Elles n'ouvrent ni ne ferment le jeu : elles décident seulement quels pronostics restent ouverts.</p>
        <Carte liste>
          <ol className={s.liste}>
            {periodes.map((p, i) => (
              <li key={p.id} className={[s.itemColonne, i > 0 && s.separe].filter(Boolean).join(' ')}>
                <span className={s.entete}>
                  <span className={s.ligneTitre}>{p.id}. {p.label}</span>
                  {periodeEnCours?.id === p.id && <Pastille accent>En cours</Pastille>}
                </span>
                <span className={s.ligneSous}>Jusqu'au {fmtJour(p.ends_at)}</span>
                <span className={s.ligneSous}>{PERIODES_DESC[p.id]}</span>
              </li>
            ))}
          </ol>
        </Carte>
      </section>

      <section className={s.section}>
        <h2 className={s.titreSection}>Classement</h2>
        <Carte>
          <div className={[s.ligneTexte, s.sansMarge].join(' ')}>
            <span className={s.ligneSous}>
              Un seul classement, qui liste les paris. Un joueur peut y figurer plusieurs fois.
              En cas d'égalité : le meilleur score au pronostic 2, puis le pari le plus ancien.
            </span>
          </div>
        </Carte>
      </section>

      <Bouton to="/parier" grand pleineLargeur>Parier</Bouton>
      <p className={s.note}>Ce site est un jeu entre amis, sans enjeu d'argent.</p>
      <Pied />
    </Ecran>
  )
}

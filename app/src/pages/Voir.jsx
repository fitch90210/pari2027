import { useGame } from '../store/GameContext'
import PronosticsReadView from '../components/PronosticsReadView'

export default function Voir() {
  const { players, paris, periodes, periodeEnCours } = useGame()

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 700 }}>
        <header style={{ paddingTop: 'var(--sp-10)', paddingBottom: 'var(--sp-6)', borderBottom: '3px solid var(--text-primary)', marginBottom: 'var(--sp-8)' }}>
          <div style={{
            fontFamily: 'var(--font)',
            fontSize: '0.7rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.14em',
            color: 'var(--red)', marginBottom: 'var(--sp-3)',
          }}>
            {periodeEnCours ? `Période ${periodeEnCours.id} · ${periodeEnCours.label}` : 'Jeu fermé'} · Lecture seule
          </div>
          <h2 style={{ fontStyle: 'italic', marginBottom: 'var(--sp-3)' }}>Tous les paris</h2>
          <p style={{ fontFamily: 'var(--font)', fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
            Le dernier pari de chaque joueur, et l'historique de ses paris précédents. Les paris sont publics en permanence.
          </p>
        </header>

        <PronosticsReadView players={players} paris={paris} periodes={periodes} />
      </div>
    </div>
  )
}

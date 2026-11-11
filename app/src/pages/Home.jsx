import { useNavigate } from 'react-router-dom'
import { useGame } from '../store/GameContext'

const PHASES = [
  {
    num: 1,
    timing: 'Avril 2026',
    desc: 'Pronostics libres : candidats, scores, finalistes, vainqueur.',
  },
  {
    num: 2,
    timing: 'Mars 2027',
    desc: 'Même chose que la Phase 1, mais avec les candidats réels au 1er tour.',
  },
  {
    num: 3,
    timing: 'Entre les deux tours',
    desc: 'Pronostic du pourcentage des deux candidats du 2ème tour.',
  },
]

const PRONOSTICS = [
  {
    num: 1,
    title: 'Candidats au 1er tour',
    pts: '+2 pts par candidat correct · +3 pts bonus si vous avez le bon nombre total',
    desc: 'Listez tous les candidats que vous prédisez présents au premier tour.',
  },
  {
    num: 2,
    title: 'Scores du 1er tour',
    pts: '+2 pts par candidat dont le score est à ± 2 points du résultat réel',
    desc: 'Attribuez un pourcentage à chaque candidat de votre liste. La somme doit faire 100 %.',
  },
  {
    num: 3,
    title: 'Les deux finalistes',
    pts: '+8 pts si les deux sont corrects · +3 pts si un seul',
    desc: 'Désignez les deux candidats qualifiés pour le second tour.',
  },
  {
    num: 4,
    title: 'Vainqueur de l\'élection',
    pts: '+6 pts',
    desc: 'Quel candidat remportera le second tour ?',
  },
  {
    num: 5,
    title: 'Score du second tour',
    pts: '+2 pts si votre score est à ± 2 points du résultat réel',
    desc: 'Estimez le score du vainqueur au second tour. En Phase 3, les deux finalistes sont connus.',
  },
]

function PhaseStatus({ current, num }) {
  if (num < current)  return <span className="badge badge-done">Passée</span>
  if (num === current) return <span className="badge badge-active">En cours</span>
  return <span className="badge badge-soon">À venir</span>
}

export default function Home() {
  const { session, players } = useGame()
  const navigate = useNavigate()

  return (
    <div className="page">
      <div className="container">

        {/* ── Une ── */}
        <header style={{ paddingTop: 'var(--sp-10)', paddingBottom: 'var(--sp-8)', borderBottom: '3px solid var(--text-primary)' }}>

          {/* Surtitre */}
          <div style={{
            fontFamily: 'var(--font)',
            fontSize: '0.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'var(--red)',
            marginBottom: 'var(--sp-4)',
          }}>
            Le jeu de pronostics · Présidentielle 2027
          </div>

          {/* Titre principal */}
          <h1 style={{
            fontStyle: 'italic',
            marginBottom: 'var(--sp-5)',
            maxWidth: 700,
            lineHeight: 1.05,
          }}>
            Vos pronostics pour la Présidentielle 2027
          </h1>

          {/* Chapeau */}
          <p style={{
            fontFamily: 'var(--font)',
            fontSize: '1.05rem',
            color: 'var(--text-secondary)',
            maxWidth: 560,
            marginBottom: 'var(--sp-8)',
            lineHeight: 1.6,
          }}>
            Trois phases, cinq pronostics : candidats, scores, finalistes et vainqueur.
            Les phases 1 et 2 couvrent les cinq pronostics. La phase 3 porte uniquement sur le score du second tour entre les deux finalistes.
          </p>

          {/* Barre action */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-5)', flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/pronostics')}>
              Jouer maintenant
            </button>
            <span style={{
              fontFamily: 'var(--font)',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              {players.length} joueur{players.length !== 1 ? 's' : ''} · Phase {session} active
            </span>
          </div>
        </header>

        {/* ── Corps ── */}
        <div className="home-body">

          {/* Colonne gauche : Phases */}
          <section className="home-phases">
            <h4 style={{ marginBottom: 'var(--sp-5)', color: 'var(--text-secondary)' }}>
              Les trois phases
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {PHASES.map((p, i) => (
                <div key={p.num} style={{
                  paddingBottom: 'var(--sp-5)',
                  marginBottom: 'var(--sp-5)',
                  borderBottom: i < PHASES.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--sp-2)' }}>
                    <div style={{
                      fontFamily: 'var(--font-serif)',
                      fontWeight: 700,
                      fontSize: '1rem',
                      color: p.num === session ? 'var(--text-primary)' : 'var(--text-secondary)',
                    }}>
                      Phase {p.num}
                    </div>
                    <PhaseStatus current={session} num={p.num} />
                  </div>
                  <div style={{
                    fontFamily: 'var(--font)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--red)',
                    marginBottom: 'var(--sp-2)',
                  }}>
                    {p.timing}
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
                    {p.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Classement */}
            <div style={{ borderTop: '3px solid var(--text-primary)', paddingTop: 'var(--sp-5)' }}>
              <h4 style={{ marginBottom: 'var(--sp-4)', color: 'var(--text-secondary)' }}>Classement</h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 'var(--sp-3)' }}>
                Chaque phase est scorée indépendamment. Le score général est la somme des trois phases.
              </p>
              <div style={{
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font)',
                borderLeft: '2px solid var(--border-mid)',
                paddingLeft: 'var(--sp-3)',
              }}>
                Départage en cas d'égalité : score du pronostic 2 (scores du 1er tour).
              </div>
            </div>
          </section>

          {/* Colonne droite : Pronostics */}
          <section className="home-pronostics">
            <h4 style={{ marginBottom: 'var(--sp-5)', color: 'var(--text-secondary)' }}>
              Les cinq pronostics
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {PRONOSTICS.map((p, i) => (
                <div key={p.num} style={{
                  display: 'grid',
                  gridTemplateColumns: '28px 1fr',
                  gap: 'var(--sp-4)',
                  paddingBottom: 'var(--sp-5)',
                  marginBottom: 'var(--sp-5)',
                  borderBottom: i < PRONOSTICS.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{
                    fontFamily: 'var(--font-serif)',
                    fontWeight: 900,
                    fontStyle: 'italic',
                    fontSize: '1.1rem',
                    color: 'var(--text-muted)',
                    paddingTop: 2,
                  }}>
                    {p.num}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 'var(--sp-1)' }}>
                      {p.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 'var(--sp-1)' }}>
                      {p.desc}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font)',
                      fontSize: '0.72rem',
                      color: 'var(--success)',
                      fontWeight: 600,
                    }}>
                      {p.pts}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── CTA bas de page ── */}
        <div style={{
          borderTop: '1px solid var(--border)',
          marginTop: 'var(--sp-10)',
          paddingTop: 'var(--sp-8)',
          display: 'flex',
          justifyContent: 'center',
        }}>
          <button className="btn btn-secondary btn-lg" onClick={() => navigate('/classements')}>
            Voir le classement
          </button>
        </div>

      </div>
    </div>
  )
}

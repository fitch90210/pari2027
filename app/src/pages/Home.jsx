import { useNavigate } from 'react-router-dom'
import { useGame } from '../store/GameContext'

// Ce qui se joue dans chaque période (les noms et les dates viennent de la base)
const PERIODES_DESC = {
  1: 'Les cinq pronostics, en toute liberté.',
  2: 'Les cinq pronostics, en toute liberté : on parie plus tard, avec plus d\'informations.',
  3: 'La liste officielle des candidats est connue : pronostics 2 à 5, sur les candidats officiels.',
  4: 'Les deux finalistes sont connus : le vainqueur et son score.',
}

const fmtJour = (iso) => new Date(iso).toLocaleDateString('fr-FR', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris',
})

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
    desc: 'Estimez le score du vainqueur au second tour.',
  },
]

function PeriodeStatus({ enCours, id }) {
  if (!enCours) return <span className="badge badge-done">Passée</span>
  if (id < enCours.id) return <span className="badge badge-done">Passée</span>
  if (id === enCours.id) return <span className="badge badge-active">En cours</span>
  return <span className="badge badge-soon">À venir</span>
}

export default function Home() {
  const { players, periodes, periodeEnCours } = useGame()
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
            Cinq pronostics : candidats, scores, finalistes, vainqueur et score du second tour.
            Parie quand tu veux, autant de fois que tu veux : un pari est daté, modifiable pendant 24 h,
            et le dernier pari de chaque période est celui qui compte.
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
              {players.length} joueur{players.length !== 1 ? 's' : ''} · {periodeEnCours ? `Période ${periodeEnCours.id} en cours` : 'Jeu fermé'}
            </span>
          </div>
        </header>

        {/* ── Corps ── */}
        <div className="home-body">

          {/* Colonne gauche : Phases */}
          <section className="home-phases">
            <h4 style={{ marginBottom: 'var(--sp-5)', color: 'var(--text-secondary)' }}>
              Les quatre périodes
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {periodes.map((p, i) => (
                <div key={p.id} style={{
                  paddingBottom: 'var(--sp-5)',
                  marginBottom: 'var(--sp-5)',
                  borderBottom: i < periodes.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--sp-2)' }}>
                    <div style={{
                      fontFamily: 'var(--font-serif)',
                      fontWeight: 700,
                      fontSize: '1rem',
                      color: p.id === periodeEnCours?.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                    }}>
                      {p.id}. {p.label}
                    </div>
                    <PeriodeStatus enCours={periodeEnCours} id={p.id} />
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
                    Jusqu'au {fmtJour(p.ends_at)}
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
                    {PERIODES_DESC[p.id]}
                  </p>
                </div>
              ))}
            </div>

            {/* Classement */}
            <div style={{ borderTop: '3px solid var(--text-primary)', paddingTop: 'var(--sp-5)' }}>
              <h4 style={{ marginBottom: 'var(--sp-4)', color: 'var(--text-secondary)' }}>Classement</h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 'var(--sp-3)' }}>
                Un classement par période, sans classement général : parier tôt, c'est concourir contre ceux qui parient tôt.
                Dans chaque période, seul ton dernier pari compte. Pas de pari dans une période, pas de place dans son classement.
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

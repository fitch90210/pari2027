import { useState } from 'react'
import CandidateAvatar from './CandidateAvatar'

// Lecture seule des paris de tous les joueurs : le dernier pari de chaque joueur,
// et l'historique de ses paris précédents.

const fmtDate = (iso) => new Date(iso).toLocaleString('fr-FR', {
  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  timeZone: 'Europe/Paris',
})

function SectionLabel({ children }) {
  return (
    <div style={{
      color: 'var(--v1-text-muted)', fontWeight: 600, fontSize: '0.72rem',
      textTransform: 'uppercase', letterSpacing: '0.06em',
      paddingTop: 'var(--v1-sp-3)', paddingBottom: 'var(--v1-sp-2)',
    }}>
      {children}
    </div>
  )
}

function CandidateRow({ name, score, badge }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--v1-sp-3)',
      paddingTop: 'var(--v1-sp-2)', paddingBottom: 'var(--v1-sp-2)',
      borderBottom: '1px solid var(--v1-border)',
    }}>
      <CandidateAvatar name={name} size={32} />
      <span style={{ flex: 1, fontSize: '0.875rem', color: 'var(--v1-text-primary)' }}>{name}</span>
      {badge && <span style={{ fontSize: '0.85rem' }}>{badge}</span>}
      {score != null && (
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--v1-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
          {score} %
        </span>
      )}
    </div>
  )
}

// Contenu d'un pari : seuls les pronostics renseignés sont affichés.
function PariContenu({ pari }) {
  const m2 = pari.m2 ?? {}
  const m3 = pari.m3?.filter(Boolean) ?? []
  const candidats = pari.m1?.length ? pari.m1 : Object.keys(m2)
  const tries = [...candidats].sort((a, b) => (parseFloat(m2[b]) || 0) - (parseFloat(m2[a]) || 0))

  return (
    <div>
      {tries.length > 0 && (
        <>
          <SectionLabel>Candidats au 1er tour</SectionLabel>
          {tries.map(name => <CandidateRow key={name} name={name} score={m2[name] ?? null} />)}
        </>
      )}
      {m3.length > 0 && (
        <>
          <SectionLabel>Finalistes</SectionLabel>
          {m3.map(name => (
            <CandidateRow key={name} name={name} badge={pari.m4 && name === pari.m4 ? '🏆' : null} />
          ))}
        </>
      )}
      {pari.m4 && !m3.includes(pari.m4) && (
        <>
          <SectionLabel>Vainqueur</SectionLabel>
          <CandidateRow name={pari.m4} badge="🏆" />
        </>
      )}
      {pari.m5 != null && (
        <>
          <SectionLabel>Score du vainqueur au second tour</SectionLabel>
          <div style={{ fontSize: '0.875rem', paddingBottom: 'var(--v1-sp-2)' }}>{pari.m5} %</div>
        </>
      )}
    </div>
  )
}

function PariEntete({ pari, periode, dernier }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--v1-sp-2)', flexWrap: 'wrap', fontSize: '0.8rem' }}>
      <strong>{fmtDate(pari.created_at)}</strong>
      <span className="badge badge-session1">
        Période {pari.periode}{periode ? ` · ${periode.label}` : ''}
      </span>
      {dernier && <span className="badge badge-done">Dernier pari</span>}
    </div>
  )
}

function Historique({ paris, periodes }) {
  const [open, setOpen] = useState(false)
  const [ouvert, setOuvert] = useState(null) // id du pari déplié
  if (!paris.length) return null
  return (
    <div style={{ borderTop: '1px solid var(--v1-border-mid)' }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: 'var(--v1-sp-3) var(--v1-sp-4)', background: 'none', border: 'none',
        cursor: 'pointer', color: 'var(--v1-text-secondary)', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600,
      }}>
        <span>Historique : {paris.length} pari{paris.length > 1 ? 's' : ''} précédent{paris.length > 1 ? 's' : ''}</span>
        <span style={{ color: 'var(--v1-text-muted)' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && paris.map(pari => (
        <div key={pari.id} style={{ borderTop: '1px solid var(--v1-border)' }}>
          <button type="button" onClick={() => setOuvert(o => o === pari.id ? null : pari.id)} style={{
            width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: 'var(--v1-sp-3) var(--v1-sp-4)', background: 'none', border: 'none',
            cursor: 'pointer', color: 'var(--v1-text-primary)', textAlign: 'left',
          }}>
            <PariEntete pari={pari} periode={periodes.find(p => p.id === pari.periode)} />
            <span style={{ color: 'var(--v1-text-muted)', fontSize: '0.8rem' }}>{ouvert === pari.id ? '▲' : '▼'}</span>
          </button>
          {ouvert === pari.id && (
            <div style={{ padding: 'var(--v1-sp-1) var(--v1-sp-4) var(--v1-sp-4)' }}>
              <PariContenu pari={pari} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function PlayerAccordion({ player, paris, periodes, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  // Paris du joueur, du plus récent au plus ancien
  const siens = paris
    .filter(p => p.player_id === player.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at) || b.id - a.id)
  const [dernier, ...anciens] = siens

  return (
    <div style={{ border: '1px solid var(--v1-border-mid)', marginBottom: 'var(--v1-sp-2)' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'var(--v1-sp-3) var(--v1-sp-4)', background: open ? 'var(--v1-bg-3)' : 'var(--v1-bg-2)',
          border: 'none', cursor: 'pointer', color: 'var(--v1-text-primary)', textAlign: 'left',
          transition: 'background var(--v1-t-fast)',
        }}
      >
        <span style={{ fontWeight: 700 }}>{player.name}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--v1-sp-3)' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--v1-text-muted)', fontFamily: 'var(--v1-font)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {siens.length === 0 ? 'Aucun pari' : `${siens.length} pari${siens.length > 1 ? 's' : ''}`}
          </span>
          <span style={{ color: 'var(--v1-text-muted)', fontSize: '0.8rem' }}>{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--v1-border-mid)' }}>
          {dernier ? (
            <>
              <div style={{ padding: 'var(--v1-sp-3) var(--v1-sp-4) var(--v1-sp-1)' }}>
                <PariEntete pari={dernier} periode={periodes.find(p => p.id === dernier.periode)} dernier />
              </div>
              <div style={{ padding: 'var(--v1-sp-1) var(--v1-sp-4) var(--v1-sp-4)' }}>
                <PariContenu pari={dernier} />
              </div>
              <Historique paris={anciens} periodes={periodes} />
            </>
          ) : (
            <p className="text-muted text-sm" style={{ fontStyle: 'italic', padding: 'var(--v1-sp-4)', margin: 0 }}>
              Ce joueur n'a pas encore posé de pari.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default function PronosticsReadView({ players, paris, periodes }) {
  if (!players.length) {
    return (
      <div style={{
        padding: 'var(--v1-sp-12) var(--v1-sp-6)', borderTop: '1px solid var(--v1-border)',
        borderBottom: '1px solid var(--v1-border)', textAlign: 'center',
      }}>
        <div style={{
          fontFamily: 'var(--v1-font-serif)', fontStyle: 'italic', fontSize: '1.5rem', fontWeight: 700,
          color: 'var(--v1-text-muted)', marginBottom: 'var(--v1-sp-3)', lineHeight: 1.2,
        }}>
          Aucun pari<br />n'a encore été posé.
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--v1-text-muted)', fontFamily: 'var(--v1-font)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Les paris apparaîtront ici dès qu'un joueur aura rejoint la partie.
        </p>
      </div>
    )
  }
  return (
    <div>
      {players.map((p, i) => (
        <PlayerAccordion key={p.id} player={p} paris={paris} periodes={periodes} defaultOpen={i === 0} />
      ))}
    </div>
  )
}

import { useState } from 'react'
import CandidateAvatar from './CandidateAvatar'

function SectionLabel({ children }) {
  return (
    <div style={{
      color: 'var(--text-muted)',
      fontWeight: 600,
      fontSize: '0.72rem',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      paddingTop: 'var(--sp-3)',
      paddingBottom: 'var(--sp-2)',
    }}>
      {children}
    </div>
  )
}

function CandidateRow({ name, score, badge }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-3)',
      paddingTop: 'var(--sp-2)',
      paddingBottom: 'var(--sp-2)',
      borderBottom: '1px solid var(--border)',
    }}>
      <CandidateAvatar name={name} size={32} />
      <span style={{ flex: 1, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{name}</span>
      {badge && <span style={{ fontSize: '0.85rem' }}>{badge}</span>}
      {score != null && (
        <span style={{
          fontSize: '0.8rem',
          fontWeight: 700,
          color: 'var(--text-muted)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {score} %
        </span>
      )}
    </div>
  )
}

function PronosticRow({ label, value }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '160px 1fr',
      gap: 'var(--sp-3)',
      paddingTop: 'var(--sp-2)',
      paddingBottom: 'var(--sp-2)',
      borderBottom: '1px solid var(--border)',
      fontSize: '0.85rem',
      alignItems: 'baseline',
    }}>
      <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <span style={{ color: value ? 'var(--text-primary)' : 'var(--text-muted)', fontStyle: value ? 'normal' : 'italic' }}>
        {value || 'Non renseigné'}
      </span>
    </div>
  )
}

function PhaseDetail({ phaseNum, pro }) {
  const [open, setOpen] = useState(phaseNum === 1)

  const hasData = !!pro
  const locked = !!pro?.lockedAt

  const m1 = pro?.m1?.filter(Boolean) ?? []
  const m2 = pro?.m2 ?? {}
  const m3 = pro?.m3?.filter(Boolean) ?? []
  const m4 = pro?.m4 ?? null
  const m5 = pro?.m5 ?? null

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--sp-3) var(--sp-4)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-primary)',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 900, fontSize: '1rem', color: 'var(--text-muted)' }}>
            {phaseNum}
          </span>
          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Phase {phaseNum}</span>
          {locked && <span className="badge badge-done">Gelée</span>}
          {!hasData && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Aucun pronostic</span>}
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{open ? '▲' : '▼'}</span>
      </button>

      <div style={{
        display: 'grid',
        gridTemplateRows: open ? '1fr' : '0fr',
        transition: 'grid-template-rows 220ms ease',
      }}>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ padding: 'var(--sp-1) var(--sp-4) var(--sp-4)' }}>
            {!hasData ? (
              <p className="text-muted text-sm" style={{ fontStyle: 'italic' }}>Aucun pronostic saisi pour cette phase.</p>
            ) : (
              <>
                {/* M1 + M2 mergés — candidats avec score si renseigné */}
                {phaseNum < 3 && (
                  <>
                    <SectionLabel>Candidats au 1er tour</SectionLabel>
                    {m1.length
                      ? [...m1]
                          .sort((a, b) => {
                            const sa = parseFloat(m2[a]) || 0
                            const sb = parseFloat(m2[b]) || 0
                            return sb - sa
                          })
                          .map(name => <CandidateRow key={name} name={name} score={m2[name] != null ? m2[name] : null} />)
                      : <p className="text-muted text-sm" style={{ fontStyle: 'italic' }}>Non renseigné</p>
                    }
                  </>
                )}

                {/* M3 + M4 + M5 mergés — second tour */}
                {phaseNum < 3 && (
                  <>
                    <SectionLabel>Second tour</SectionLabel>
                    {m3.length ? (() => {
                      // M5 est toujours le score de m3[0], 100-M5 est le score de m3[1]
                      const score0 = m5 != null ? parseFloat(m5) : null
                      const score1 = score0 != null ? parseFloat((100 - score0).toFixed(1)) : null
                      const scores = { [m3[0]]: score0, [m3[1]]: score1 }
                      const winner = m4 && m3.includes(m4) ? m4 : null
                      return m3.map(name => (
                        <CandidateRow
                          key={name}
                          name={name}
                          score={scores[name]}
                          badge={name === winner ? '🏆' : null}
                        />
                      ))
                    })() : <p className="text-muted text-sm" style={{ fontStyle: 'italic' }}>Non renseigné</p>}
                  </>
                )}

                {/* Phase 3 — score 2nd tour seul (sans finalistes en M3) */}
                {phaseNum === 3 && m5 != null && (
                  <PronosticRow label="Score 2nd tour" value={`${m5} %`} />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function PlayerAccordion({ player, pronosticsMap, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  const pMap = pronosticsMap[player.id] || {}
  const filledCount = [1, 2, 3].filter(s => !!pMap[`s${s}`]).length

  return (
    <div style={{ border: '1px solid var(--border-mid)', marginBottom: 'var(--sp-2)' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--sp-3) var(--sp-4)',
          background: open ? 'var(--bg-3)' : 'var(--bg-2)',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-primary)',
          textAlign: 'left',
          transition: 'background var(--t-fast)',
        }}
      >
        <span style={{ fontWeight: 700 }}>{player.name}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {filledCount}/3 phase{filledCount !== 1 ? 's' : ''}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{open ? '▲' : '▼'}</span>
        </div>
      </button>

      <div style={{
        display: 'grid',
        gridTemplateRows: open ? '1fr' : '0fr',
        transition: 'grid-template-rows 240ms ease',
      }}>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ borderTop: '1px solid var(--border-mid)' }}>
            {[1, 2, 3].map(phaseNum => (
              <PhaseDetail key={phaseNum} phaseNum={phaseNum} pro={pMap[`s${phaseNum}`] ?? null} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PronosticsReadView({ players, pronosticsMap }) {
  if (!players.length) {
    return (
      <div style={{
        padding: 'var(--sp-12) var(--sp-6)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        textAlign: 'center',
      }}>
        <div style={{
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: '1.5rem',
          fontWeight: 700,
          color: 'var(--text-muted)',
          marginBottom: 'var(--sp-3)',
          lineHeight: 1.2,
        }}>
          Aucun pronostic<br />n'a encore été déposé.
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Les pronostics apparaîtront ici dès qu'un joueur aura rejoint la partie.
        </p>
      </div>
    )
  }
  return (
    <div>
      {players.map((p, i) => (
        <PlayerAccordion
          key={p.id}
          player={p}
          pronosticsMap={pronosticsMap}
          defaultOpen={i === 0}
        />
      ))}
    </div>
  )
}

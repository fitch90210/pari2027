import { useState } from 'react'
import { useGame } from '../store/GameContext'
import { classementPeriode } from '../lib/scoring'

const norm = (s) => s?.trim().toLowerCase() ?? ''
const fmtDate = (iso) => new Date(iso).toLocaleDateString('fr-FR', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris',
})

function RankBadge({ rank }) {
  if (rank === 1) return <span className="rank-1">1er</span>
  if (rank === 2) return <span className="rank-2">2e</span>
  if (rank === 3) return <span className="rank-3">3e</span>
  return <span className="text-muted">{rank}e</span>
}

function ScoreCell({ value }) {
  return (
    <td className={`score-cell ${value > 0 ? 'positive' : 'zero'}`} style={{ textAlign: 'center' }}>
      {value}
    </td>
  )
}

function LeaderboardTable({ entries, periode, nomDe, onDetail }) {
  if (!entries.length) {
    return <p className="text-muted text-sm">Personne n'a posé de pari dans cette période.</p>
  }
  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Rang</th>
            <th>Joueur</th>
            {periode.scored.map((m, i) => (
              <th key={m} style={{ textAlign: 'center', borderLeft: i === 0 ? '1px solid var(--border)' : undefined }}>
                {m.slice(1)}
              </th>
            ))}
            <th style={{ textAlign: 'center', borderLeft: '1px solid var(--border)' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(entry => (
            <tr key={entry.player_id} style={{ cursor: 'pointer' }} onClick={() => onDetail(entry)}>
              <td><RankBadge rank={entry.rank} /></td>
              <td style={{ fontWeight: 700 }}>{nomDe(entry.player_id)}</td>
              {periode.scored.map(m => <ScoreCell key={m} value={entry.scores[m]} />)}
              <td style={{
                textAlign: 'center', fontWeight: 900, fontSize: '1rem',
                color: 'var(--text-primary)', borderLeft: '1px solid var(--border)',
              }}>
                {entry.scores.total}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Détail d'un pari classé ───────────────────────────────────

function Ligne({ titre, pts, children }) {
  return (
    <div style={{ marginBottom: 'var(--sp-4)' }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 'var(--sp-2)' }}>
        {titre}
        <span style={{ float: 'right', color: pts > 0 ? 'var(--success)' : 'var(--text-muted)' }}>{pts} pts</span>
      </div>
      {children}
    </div>
  )
}

function DetailModal({ entry, periode, nom, results, onClose }) {
  const { pari, scores } = entry
  const realCandidates = new Set((results.candidates ?? []).map(norm))
  const realFinalists = new Set((results.finalists ?? []).map(norm))
  const ouvert = (m) => periode.scored.includes(m)
  const m2Candidates = periode.id <= 2 ? pari.m1 : results.candidates
  const m5Ok = pari.m5 != null && Math.abs(parseFloat(pari.m5) - parseFloat(results.winnerScore)) <= 2

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--sp-4)',
      }}
      onClick={onClose}
    >
      <div className="card" style={{ maxWidth: 600, width: '100%', maxHeight: '85dvh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 style={{ marginBottom: 4 }}>{nom}</h3>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Pari du {fmtDate(pari.created_at)} · Période {periode.id} :{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{scores.total} pts</strong>
            </span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        {ouvert('m1') && (
          <Ligne titre="Pronostic 1 : Candidats" pts={scores.m1}>
            {pari.m1?.length ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
                {pari.m1.map(c => (
                  <span key={c} className="tag" style={{
                    borderColor: realCandidates.has(norm(c)) ? 'rgba(76,175,125,0.3)' : 'rgba(224,82,82,0.3)',
                    color: realCandidates.has(norm(c)) ? 'var(--success)' : 'var(--danger)',
                  }}>
                    {realCandidates.has(norm(c)) ? '✓' : '✗'} {c}
                  </span>
                ))}
              </div>
            ) : <span className="text-muted text-sm">Non saisi</span>}
          </Ligne>
        )}

        {ouvert('m2') && (
          <Ligne titre="Pronostic 2 : Scores" pts={scores.m2}>
            {!m2Candidates?.length ? <span className="text-muted text-sm">Non saisi</span> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' }}>
                {m2Candidates.map(c => {
                  const pred = pari.m2?.[c]
                  const realKey = Object.keys(results.scores ?? {}).find(k => norm(k) === norm(c))
                  const real = realKey != null ? results.scores[realKey] : null
                  const hit = pred != null && real != null && Math.abs(parseFloat(pred) - parseFloat(real)) <= 2
                  return (
                    <div key={c} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span>{c}</span>
                      <span>
                        <span style={{ color: 'var(--text-muted)' }}>Prédit : </span>
                        <strong>{pred != null ? `${pred}%` : 'n/a'}</strong>
                        <span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>·</span>
                        <span style={{ color: 'var(--text-muted)' }}>Réel : </span>
                        <strong>{real != null ? `${real}%` : 'n/a'}</strong>
                        {pred != null && real != null && (
                          <span style={{ marginLeft: 6, color: hit ? 'var(--success)' : 'var(--danger)' }}>{hit ? '✓' : '✗'}</span>
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </Ligne>
        )}

        {ouvert('m3') && (
          <Ligne titre="Pronostic 3 : Finalistes" pts={scores.m3}>
            <div style={{ fontSize: '0.875rem' }}>
              {pari.m3?.filter(Boolean).length ? pari.m3.filter(Boolean).map((f, i) => (
                <span key={i} style={{
                  display: 'inline-block', marginRight: 8,
                  color: realFinalists.has(norm(f)) ? 'var(--success)' : 'var(--danger)',
                }}>
                  {realFinalists.has(norm(f)) ? '✓' : '✗'} {f}
                </span>
              )) : <span className="text-muted">Non saisi</span>}
            </div>
          </Ligne>
        )}

        {ouvert('m4') && (
          <Ligne titre="Pronostic 4 : Vainqueur" pts={scores.m4}>
            {pari.m4 ? (
              <>
                <span style={{ fontSize: '0.875rem', color: norm(pari.m4) === norm(results.winner) ? 'var(--success)' : 'var(--danger)' }}>
                  {norm(pari.m4) === norm(results.winner) ? '✓ ' : '✗ '}{pari.m4}
                </span>
                <span className="text-muted text-sm" style={{ marginLeft: 8 }}>(réel : {results.winner})</span>
              </>
            ) : <span className="text-muted text-sm">Non saisi</span>}
          </Ligne>
        )}

        {ouvert('m5') && (
          <Ligne titre="Pronostic 5 : Score du vainqueur" pts={scores.m5}>
            {pari.m5 != null ? (
              <span style={{ fontSize: '0.875rem', color: m5Ok ? 'var(--success)' : 'var(--danger)' }}>
                {m5Ok ? '✓ ' : '✗ '}Prédit : {pari.m5}% · Réel : {results.winnerScore}%
              </span>
            ) : <span className="text-muted text-sm">Non saisi</span>}
          </Ligne>
        )}
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────

export default function Classements() {
  const { players, paris, periodes, periodeEnCours, results } = useGame()
  const [choisie, setChoisie] = useState(null)
  const [detail, setDetail] = useState(null)

  const periode = periodes.find(p => p.id === (choisie ?? periodeEnCours?.id ?? periodes.at(-1)?.id)) ?? null
  const nomDe = (id) => players.find(p => p.id === id)?.name ?? '?'
  const entries = periode ? classementPeriode(paris, periode, results) : []

  return (
    <div className="page">
      <div className="container">
        <header style={{ paddingTop: 'var(--sp-10)', paddingBottom: 'var(--sp-6)', borderBottom: '3px solid var(--text-primary)', marginBottom: 'var(--sp-8)' }}>
          <div style={{
            fontFamily: 'var(--font)', fontSize: '0.7rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--red)', marginBottom: 'var(--sp-3)',
          }}>
            Pari 2027 · Résultats
          </div>
          <h2 style={{ marginBottom: 'var(--sp-3)', fontStyle: 'italic' }}>Classements par période</h2>
          <p style={{ fontFamily: 'var(--font)', fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
            {results
              ? 'Dans chaque période, le dernier pari de chaque joueur compte. Cliquez sur un joueur pour voir le détail.'
              : 'En attente des résultats officiels.'}
          </p>
        </header>

        <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap', marginBottom: 'var(--sp-6)' }}>
          {periodes.map(p => (
            <button key={p.id} type="button"
              className={`btn btn-sm ${p.id === periode?.id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setChoisie(p.id)}>
              {p.id}. {p.label}{p.id === periodeEnCours?.id ? ' · en cours' : ''}
            </button>
          ))}
        </div>

        {!results && (
          <div className="card" style={{ padding: 'var(--sp-10) var(--sp-6)' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '0.8rem', fontWeight: 700, fontStyle: 'italic', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--sp-3)' }}>
              Résultats non disponibles
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
              Les scores seront calculés une fois que l'administrateur aura saisi les résultats officiels.
            </p>
          </div>
        )}

        {results && periode && (
          <LeaderboardTable entries={entries} periode={periode} nomDe={nomDe} onDetail={setDetail} />
        )}
      </div>

      {detail && results && periode && (
        <DetailModal entry={detail} periode={periode} nom={nomDe(detail.player_id)} results={results}
          onClose={() => setDetail(null)} />
      )}
    </div>
  )
}

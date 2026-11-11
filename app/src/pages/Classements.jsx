import { useState } from 'react'
import { useGame } from '../store/GameContext'
import { computeLeaderboard } from '../lib/scoring'

function RankBadge({ rank }) {
  if (rank === 1) return <span className="rank-1">1er</span>
  if (rank === 2) return <span className="rank-2">2e</span>
  if (rank === 3) return <span className="rank-3">3e</span>
  return <span className="text-muted">{rank}e</span>
}

function ScoreCell({ value }) {
  if (value == null) return <td className="text-muted" style={{ textAlign: 'center' }}>·</td>
  return (
    <td className={`score-cell ${value > 0 ? 'positive' : 'zero'}`} style={{ textAlign: 'center' }}>
      {value}
    </td>
  )
}

function LeaderboardTable({ entries, onDetail }) {
  if (!entries.length) {
    return <p className="text-muted text-sm">Aucun joueur dans le classement.</p>
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Rang</th>
            <th>Joueur</th>
            <th colSpan={5} style={{ textAlign: 'center', borderLeft: '1px solid var(--border)' }}>Phase 1</th>
            <th colSpan={4} style={{ textAlign: 'center', borderLeft: '1px solid var(--border)' }}>Phase 2</th>
            <th style={{ textAlign: 'center', borderLeft: '1px solid var(--border)' }}>P3</th>
            <th style={{ textAlign: 'center', borderLeft: '1px solid var(--border)' }}>Total</th>
          </tr>
          <tr>
            <th /><th />
            {['1','2','3','4','5'].map(n => (
              <th key={`p1-${n}`} style={{ textAlign: 'center', borderLeft: n === '1' ? '1px solid var(--border)' : undefined }}>{n}</th>
            ))}
            {['2','3','4','5'].map(n => (
              <th key={`p2-${n}`} style={{ textAlign: 'center', borderLeft: n === '2' ? '1px solid var(--border)' : undefined }}>{n}</th>
            ))}
            <th style={{ borderLeft: '1px solid var(--border)' }} />
            <th style={{ borderLeft: '1px solid var(--border)' }} />
          </tr>
        </thead>
        <tbody>
          {entries.map(entry => (
            <tr key={entry.player.id} style={{ cursor: 'pointer' }} onClick={() => onDetail(entry)}>
              <td><RankBadge rank={entry.rank} /></td>
              <td style={{ fontWeight: 700 }}>{entry.player.name}</td>
              <ScoreCell value={entry.scoresS1.m1} />
              <ScoreCell value={entry.scoresS1.m2} />
              <ScoreCell value={entry.scoresS1.m3} />
              <ScoreCell value={entry.scoresS1.m4} />
              <ScoreCell value={entry.scoresS1.m5} />
              <ScoreCell value={entry.scoresS2.m2} />
              <ScoreCell value={entry.scoresS2.m3} />
              <ScoreCell value={entry.scoresS2.m4} />
              <ScoreCell value={entry.scoresS2.m5} />
              <ScoreCell value={entry.scoresS3.m5} />
              <td style={{
                textAlign: 'center', fontWeight: 900, fontSize: '1rem',
                color: 'var(--text-primary)', borderLeft: '1px solid var(--border)',
              }}>
                {entry.total}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Modal détail joueur ───────────────────────────────────────

function SessionDetail({ label, pronostic, scores, results, phase = 1 }) {
  const norm = (s) => s?.trim().toLowerCase() ?? ''
  const realSet = new Set((results.candidates ?? []).map(norm))
  const realFinalists = new Set((results.finalists ?? []).map(norm))

  if (!pronostic) {
    return (
      <div>
        <div style={{
          fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--sp-3)',
        }}>
          {label}
        </div>
        <p className="text-muted text-sm">Pas de pronostic pour cette phase.</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{
        fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)',
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--sp-4)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span>{label}</span>
        <span style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 900 }}>
          {scores.total} pts
        </span>
      </div>

      {/* M1 — uniquement en Phase 1 */}
      {phase === 1 && (
        <div style={{ marginBottom: 'var(--sp-4)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 'var(--sp-2)' }}>
            Pronostic 1 : Candidats<span style={{ float: 'right', color: scores.m1 > 0 ? 'var(--success)' : 'var(--text-muted)' }}>{scores.m1} pts</span>
          </div>
          {pronostic.m1?.length ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
              {pronostic.m1.map(c => (
                <span key={c} className="tag" style={{
                  borderColor: realSet.has(norm(c)) ? 'rgba(76,175,125,0.3)' : 'rgba(224,82,82,0.3)',
                  color: realSet.has(norm(c)) ? 'var(--success)' : 'var(--danger)',
                }}>
                  {realSet.has(norm(c)) ? '✓' : '✗'} {c}
                </span>
              ))}
            </div>
          ) : <span className="text-muted text-sm">Non saisi</span>}
        </div>
      )}

      {/* M2 — en Phase 1 on itère sur les candidats prédits, en Phase 2 sur les candidats officiels */}
      <div style={{ marginBottom: 'var(--sp-4)' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 'var(--sp-2)' }}>
          Pronostic 2 : Scores<span style={{ float: 'right', color: scores.m2 > 0 ? 'var(--success)' : 'var(--text-muted)' }}>{scores.m2} pts</span>
        </div>
        {(() => {
          const m2Candidates = phase === 1 ? pronostic.m1 : results.candidates
          if (!m2Candidates?.length) return <span className="text-muted text-sm">Non saisi</span>
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' }}>
              {m2Candidates.map(c => {
                const pred = pronostic.m2?.[c]
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
                        <span style={{ marginLeft: 6, color: hit ? 'var(--success)' : 'var(--danger)' }}>
                          {hit ? '✓' : '✗'}
                        </span>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        })()}
      </div>

      {/* M3 */}
      <div style={{ marginBottom: 'var(--sp-4)' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 'var(--sp-2)' }}>
          Pronostic 3 : Finalistes<span style={{ float: 'right', color: scores.m3 > 0 ? 'var(--success)' : 'var(--text-muted)' }}>{scores.m3} pts</span>
        </div>
        <div style={{ fontSize: '0.875rem' }}>
          {pronostic.m3?.filter(Boolean).length ? pronostic.m3.filter(Boolean).map((f, i) => (
            <span key={i} style={{
              display: 'inline-block', marginRight: 8,
              color: realFinalists.has(norm(f)) ? 'var(--success)' : 'var(--danger)',
            }}>
              {realFinalists.has(norm(f)) ? '✓' : '✗'} {f}
            </span>
          )) : <span className="text-muted">Non saisi</span>}
        </div>
      </div>

      {/* M4 */}
      <div style={{ marginBottom: 'var(--sp-4)' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 'var(--sp-2)' }}>
          Pronostic 4 : Vainqueur<span style={{ float: 'right', color: scores.m4 > 0 ? 'var(--success)' : 'var(--text-muted)' }}>{scores.m4} pts</span>
        </div>
        <span style={{
          fontSize: '0.875rem',
          color: pronostic.m4 && norm(pronostic.m4) === norm(results.winner) ? 'var(--success)' : 'var(--danger)',
        }}>
          {pronostic.m4
            ? (norm(pronostic.m4) === norm(results.winner) ? '✓ ' : '✗ ') + pronostic.m4
            : <span className="text-muted">Non saisi</span>
          }
        </span>
        <span className="text-muted text-sm" style={{ marginLeft: 8 }}>(réel : {results.winner})</span>
      </div>

      {/* M5 */}
      <div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 'var(--sp-2)' }}>
          Pronostic 5 : Score 2nd tour<span style={{ float: 'right', color: scores.m5 > 0 ? 'var(--success)' : 'var(--text-muted)' }}>{scores.m5} pts</span>
        </div>
        {pronostic.m5 != null ? (
          <span style={{
            fontSize: '0.875rem',
            color: Math.abs(parseFloat(pronostic.m5) - parseFloat(results.winnerScore)) <= 2 ? 'var(--success)' : 'var(--danger)',
          }}>
            {Math.abs(parseFloat(pronostic.m5) - parseFloat(results.winnerScore)) <= 2 ? '✓ ' : '✗ '}
            Prédit : {pronostic.m5}% · Réel : {results.winnerScore}%
          </span>
        ) : <span className="text-muted text-sm">Non saisi</span>}
      </div>
    </div>
  )
}

function DetailModal({ entry, results, onClose }) {
  if (!entry || !results) return null
  const { player, scoresS1, scoresS2, scoresS3 } = entry
  const pMap = entry._pMap ?? {}

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'var(--sp-4)',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ maxWidth: 600, width: '100%', maxHeight: '85dvh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 style={{ marginBottom: 4 }}>{player.name}</h3>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Total général : <strong style={{ color: 'var(--text-primary)' }}>{entry.total} pts</strong>
            </span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-8)' }}>
          <SessionDetail label="Phase 1" pronostic={pMap.s1} scores={scoresS1} results={results} phase={1} />
          <div className="divider" style={{ margin: 0 }} />
          <SessionDetail label="Phase 2" pronostic={pMap.s2} scores={scoresS2} results={results} phase={2} />
          <div className="divider" style={{ margin: 0 }} />
          {/* S3 — uniquement M5 */}
          <div>
            <div style={{
              fontSize: '0.72rem', fontWeight: 700, color: 'var(--gold)',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--sp-4)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span>Phase 3</span>
              <span style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 900 }}>
                {scoresS3.total} pts
              </span>
            </div>
            {pMap.s3 ? (
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 'var(--sp-2)' }}>
                  Pronostic 5 : Score 2nd tour
                  <span style={{ float: 'right', color: scoresS3.m5 > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                    {scoresS3.m5} pts
                  </span>
                </div>
                {pMap.s3.m5 != null ? (
                  <span style={{
                    fontSize: '0.875rem',
                    color: Math.abs(parseFloat(pMap.s3.m5) - parseFloat(results.winnerScore)) <= 2
                      ? 'var(--success)' : 'var(--danger)',
                  }}>
                    {Math.abs(parseFloat(pMap.s3.m5) - parseFloat(results.winnerScore)) <= 2 ? '✓ ' : '✗ '}
                    Prédit : {pMap.s3.m5}% · Réel : {results.winnerScore}%
                  </span>
                ) : <span className="text-muted text-sm">Non saisi</span>}
              </div>
            ) : (
              <p className="text-muted text-sm">Pas de pronostic pour cette phase.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────

export default function Classements() {
  const { players, pronosticsMap, results } = useGame()
  const [detail, setDetail] = useState(null)

  const entries = computeLeaderboard(players, pronosticsMap, results)

  const openDetail = (entry) => {
    setDetail({ ...entry, _pMap: pronosticsMap[entry.player.id] ?? {} })
  }

  return (
    <div className="page">
      <div className="container">
        <header style={{ paddingTop: 'var(--sp-10)', paddingBottom: 'var(--sp-6)', borderBottom: '3px solid var(--text-primary)', marginBottom: 'var(--sp-8)' }}>
          <div style={{
            fontFamily: 'var(--font)',
            fontSize: '0.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'var(--red)',
            marginBottom: 'var(--sp-3)',
          }}>
            Pari 2027 · Résultats
          </div>
          <h2 style={{ marginBottom: 'var(--sp-3)', fontStyle: 'italic' }}>Classement général</h2>
          <p style={{ fontFamily: 'var(--font)', fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
            {results
              ? 'Somme des scores P1 + P2 + P3. Cliquez sur un joueur pour voir le détail.'
              : 'En attente des résultats officiels.'}
          </p>
        </header>

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

        {results && (
          <LeaderboardTable entries={entries} onDetail={openDetail} />
        )}
      </div>

      {detail && (
        <DetailModal
          entry={detail}
          results={results}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  )
}

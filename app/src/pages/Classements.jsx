import { useState } from 'react'
import { useGame } from '../store/GameContext'
import { classementPeriode } from '../lib/scoring'
import PariScoreDetail from '../components/PariScoreDetail'

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
              <th key={m} style={{ textAlign: 'center', borderLeft: i === 0 ? '1px solid var(--v1-border)' : undefined }}>
                {m.slice(1)}
              </th>
            ))}
            <th style={{ textAlign: 'center', borderLeft: '1px solid var(--v1-border)' }}>Total</th>
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
                color: 'var(--v1-text-primary)', borderLeft: '1px solid var(--v1-border)',
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

function DetailModal({ entry, periode, nom, results, onClose }) {
  const { pari, scores } = entry
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--v1-sp-4)',
      }}
      onClick={onClose}
    >
      <div className="card" style={{ maxWidth: 600, width: '100%', maxHeight: '85dvh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 style={{ marginBottom: 4 }}>{nom}</h3>
            <span style={{ fontSize: '0.875rem', color: 'var(--v1-text-muted)' }}>
              Pari du {fmtDate(pari.created_at)} · Période {periode.id} :{' '}
              <strong style={{ color: 'var(--v1-text-primary)' }}>{scores.total} pts</strong>
            </span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <PariScoreDetail pari={pari} periode={periode} scores={scores} results={results} />
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
        <header style={{ paddingTop: 'var(--v1-sp-10)', paddingBottom: 'var(--v1-sp-6)', borderBottom: '3px solid var(--v1-text-primary)', marginBottom: 'var(--v1-sp-8)' }}>
          <div style={{
            fontFamily: 'var(--v1-font)', fontSize: '0.7rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--v1-red)', marginBottom: 'var(--v1-sp-3)',
          }}>
            Pari 2027 · Résultats
          </div>
          <h2 style={{ marginBottom: 'var(--v1-sp-3)', fontStyle: 'italic' }}>Classements par période</h2>
          <p style={{ fontFamily: 'var(--v1-font)', fontSize: '0.875rem', color: 'var(--v1-text-secondary)', margin: 0 }}>
            {results
              ? 'Dans chaque période, le dernier pari de chaque joueur compte. Cliquez sur un joueur pour voir le détail.'
              : 'En attente des résultats officiels.'}
          </p>
        </header>

        <div style={{ display: 'flex', gap: 'var(--v1-sp-2)', flexWrap: 'wrap', marginBottom: 'var(--v1-sp-6)' }}>
          {periodes.map(p => (
            <button key={p.id} type="button"
              className={`btn btn-sm ${p.id === periode?.id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setChoisie(p.id)}>
              {p.id}. {p.label}{p.id === periodeEnCours?.id ? ' · en cours' : ''}
            </button>
          ))}
        </div>

        {!results && (
          <div className="card" style={{ padding: 'var(--v1-sp-10) var(--v1-sp-6)' }}>
            <div style={{ fontFamily: 'var(--v1-font-serif)', fontSize: '0.8rem', fontWeight: 700, fontStyle: 'italic', color: 'var(--v1-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--v1-sp-3)' }}>
              Résultats non disponibles
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--v1-text-secondary)', margin: 0 }}>
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

const norm = (s) => s?.trim().toLowerCase() ?? ''

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

// Détail point par point d'un pari scoré : ce qui était prédit, le résultat réel, les points.
export default function PariScoreDetail({ pari, periode, scores, results }) {
  const realCandidates = new Set((results.candidates ?? []).map(norm))
  const realFinalists = new Set((results.finalists ?? []).map(norm))
  const ouvert = (m) => periode.scored.includes(m)
  const m2Candidates = periode.id <= 2 ? pari.m1 : results.candidates
  const m5Ok = pari.m5 != null && Math.abs(parseFloat(pari.m5) - parseFloat(results.winnerScore)) <= 2

  return (
    <div>
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
  )
}

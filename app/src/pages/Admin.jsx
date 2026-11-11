import { useState } from 'react'
import { useGame } from '../store/GameContext'
import PronosticsReadView from '../components/PronosticsReadView'

// ── Helpers ───────────────────────────────────────────────────

function SaveFeedback({ ok, err }) {
  if (err) return <div className="error-banner">{err}</div>
  if (ok) return (
    <div style={{ background: 'var(--success-dim)', border: '1px solid rgba(76,175,125,0.2)', borderRadius: 'var(--r-sm)', padding: 'var(--sp-2) var(--sp-3)', color: 'var(--success)', fontSize: '0.875rem' }}>
      Enregistré ✓
    </div>
  )
  return null
}


// ── PIN ───────────────────────────────────────────────────────

function PinScreen({ onLogin }) {
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const [checking, setChecking] = useState(false)

  const check = async (e) => {
    e.preventDefault()
    setChecking(true); setErr('')
    try {
      const ok = await onLogin(pin)
      if (!ok) { setErr('Mot de passe incorrect.'); setPin('') }
    } catch { setErr('Erreur de connexion.') }
    finally { setChecking(false) }
  }

  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 360, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--sp-8)' }}>
          <div style={{
            fontFamily: 'var(--font)',
            fontSize: '0.7rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.14em',
            color: 'var(--red)', marginBottom: 'var(--sp-3)',
          }}>
            Accès restreint
          </div>
          <h2 style={{ fontStyle: 'italic', marginBottom: 'var(--sp-2)' }}>Administration</h2>
          <p style={{ fontFamily: 'var(--font)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Saisir le mot de passe admin pour continuer.
          </p>
        </div>
        <div className="card">
          <form onSubmit={check} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            <input className="input" type="password" maxLength={64} autoComplete="current-password"
              placeholder="Mot de passe" value={pin} autoFocus aria-label="Mot de passe admin"
              onChange={e => { setPin(e.target.value); setErr('') }}
              style={{ textAlign: 'center' }} />
            {err && <div className="error-banner">{err}</div>}
            <button className="btn btn-primary w-full" type="submit" disabled={!pin || checking}>
              {checking ? '…' : 'Accéder'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── Étape 1 : Candidats du 1er tour ──────────────────────────
// Saisie libre des noms, un par ligne

function StepCandidatsR1({ officialCandidatesR1, onSave }) {
  const [raw, setRaw] = useState(officialCandidatesR1.join('\n'))
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState(false)
  const [err, setErr] = useState('')

  const handle = async (e) => {
    e.preventDefault()
    const list = raw.split('\n').map(s => s.trim()).filter(Boolean)
    setSaving(true); setErr('')
    try {
      await onSave(list)
      setOk(true); setTimeout(() => setOk(false), 2000)
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  return (
    <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
        Candidats présents au 1er tour
        <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>(un par ligne)</span>
      </label>
      <textarea className="input" rows={8} placeholder={"Marine Le Pen\nEmmanuel Macron\nJean-Luc Mélenchon\n..."}
        value={raw} onChange={e => setRaw(e.target.value)} style={{ resize: 'vertical' }} />
      <SaveFeedback ok={ok} err={err} />
      <button className="btn btn-primary" type="submit" disabled={saving} style={{ alignSelf: 'flex-start' }}>
        {saving ? 'Enregistrement…' : 'Enregistrer la liste'}
      </button>
    </form>
  )
}

// ── Étape 2 : Scores du 1er tour ─────────────────────────────
// Un champ % par candidat. Les 2 plus hauts → finalistes auto.

function StepScoresR1({ officialCandidatesR1, results, onSave }) {
  const initScores = () => {
    const s = {}
    officialCandidatesR1.forEach(c => {
      s[c] = results?.scores?.[c] != null ? String(results.scores[c]) : ''
    })
    return s
  }
  const [scores, setScores] = useState(initScores)
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState(false)
  const [err, setErr] = useState('')

  if (!officialCandidatesR1.length) {
    return <p className="text-muted text-sm">Renseignez d'abord la liste des candidats (étape 1).</p>
  }

  // Calcul live des deux finalistes
  const parsed = officialCandidatesR1
    .map(c => ({ name: c, score: parseFloat(scores[c]) }))
    .filter(x => !isNaN(x.score))
    .sort((a, b) => b.score - a.score)
  const finalists = parsed.slice(0, 2).map(x => x.name)

  const total = parsed.reduce((s, x) => s + x.score, 0)
  const totalOk = parsed.length === officialCandidatesR1.length && Math.abs(total - 100) < 0.2

  const handle = async (e) => {
    e.preventDefault()
    const scoresObj = {}
    let missing = false
    officialCandidatesR1.forEach(c => {
      const v = parseFloat(scores[c])
      if (isNaN(v)) { missing = true } else { scoresObj[c] = v }
    })
    if (missing) { setErr('Tous les scores doivent être renseignés.'); return }
    if (finalists.length < 2) { setErr('Impossible de déterminer 2 finalistes.'); return }

    setSaving(true); setErr('')
    try {
      // Sauvegarde scores R1 + finalistes calculés + candidats dans results
      await onSave({
        candidates: officialCandidatesR1,
        scores: scoresObj,
        finalists,
        // winner et winnerScore restent inchangés si déjà saisis
        winner: results?.winner ?? '',
        winnerScore: results?.winnerScore ?? null,
      })
      setOk(true); setTimeout(() => setOk(false), 2000)
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  return (
    <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
        {officialCandidatesR1.map(c => (
          <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
            <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 500 }}>{c}</span>
            <input type="number" step="0.1" min="0" max="100"
              className="input input-sm" style={{ width: 100 }}
              placeholder="0.0" value={scores[c] ?? ''}
              onChange={e => setScores(s => ({ ...s, [c]: e.target.value }))} />
            <span className="text-muted text-sm">%</span>
          </div>
        ))}
      </div>

      {/* Total */}
      <div style={{
        display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-2)',
        fontSize: '0.875rem', fontWeight: 700,
        paddingTop: 'var(--sp-2)', borderTop: '1px solid var(--border)',
      }}>
        <span className="text-muted">Total :</span>
        <span style={{ color: totalOk ? 'var(--success)' : parsed.length > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
          {parsed.length > 0 ? `${total.toFixed(1)} %` : 'n/a'} {totalOk && '✓'}
        </span>
      </div>

      {/* Finalistes calculés */}
      {finalists.length === 2 && (
        <div style={{
          borderLeft: '3px solid var(--border-strong)',
          paddingLeft: 'var(--sp-4)',
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--sp-2)' }}>
            Finalistes calculés automatiquement
          </div>
          <div style={{ fontWeight: 700 }}>
            {finalists[0]} <span className="text-muted">vs</span> {finalists[1]}
          </div>
          <div className="text-muted text-xs mt-2">
            Ces deux candidats seront disponibles en Phase 3.
          </div>
        </div>
      )}

      <SaveFeedback ok={ok} err={err} />
      <button className="btn btn-primary" type="submit" disabled={saving} style={{ alignSelf: 'flex-start' }}>
        {saving ? 'Enregistrement…' : 'Enregistrer les scores du 1er tour'}
      </button>
    </form>
  )
}

// ── Étape 3 : Scores du 2nd tour ─────────────────────────────
// Deux finalistes, champs liés (somme = 100). Vainqueur = score le plus élevé.

function StepScoresR2({ results, onSave }) {
  const finalists = results?.finalists ?? []
  const initA = () => results?.winnerScore != null
    // winnerScore = score du vainqueur. On retrouve lequel est le vainqueur.
    ? (results.winner === finalists[0] ? String(results.winnerScore) : String(100 - results.winnerScore))
    : ''
  const [scoreA, setScoreA] = useState(initA)
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState(false)
  const [err, setErr] = useState('')

  if (!finalists.length) {
    return <p className="text-muted text-sm">Les finalistes seront disponibles après la saisie des scores du 1er tour (étape 2).</p>
  }

  const valA = parseFloat(scoreA)
  const valB = !isNaN(valA) ? parseFloat((100 - valA).toFixed(1)) : null
  const winner = !isNaN(valA) && valB !== null
    ? (valA >= valB ? finalists[0] : finalists[1])
    : null
  const winnerScore = !isNaN(valA) && valB !== null
    ? Math.max(valA, valB)
    : null

  const handle = async (e) => {
    e.preventDefault()
    if (isNaN(valA) || valA < 0 || valA > 100) { setErr('Score invalide.'); return }
    setSaving(true); setErr('')
    try {
      await onSave({
        ...results,
        winner,
        winnerScore,
      })
      setOk(true); setTimeout(() => setOk(false), 2000)
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  return (
    <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
        {/* Finaliste A */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
          <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 500 }}>{finalists[0]}</span>
          <input type="number" step="0.1" min="0" max="100"
            className="input input-sm" style={{ width: 100 }}
            placeholder="0.0" value={scoreA}
            onChange={e => setScoreA(e.target.value)} />
          <span className="text-muted text-sm">%</span>
        </div>
        {/* Finaliste B — calculé auto */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
          <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 500 }}>{finalists[1]}</span>
          <span style={{
            width: 100, textAlign: 'right', padding: 'var(--sp-2) var(--sp-3)',
            background: 'var(--bg-3)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-sm)', fontSize: '0.875rem', color: 'var(--text-muted)',
          }}>
            {valB != null ? valB : 'n/a'}
          </span>
          <span className="text-muted text-sm">%</span>
        </div>
      </div>

      {/* Total */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-2)', fontSize: '0.875rem', fontWeight: 700, paddingTop: 'var(--sp-2)', borderTop: '1px solid var(--border)' }}>
        <span className="text-muted">Total :</span>
        <span style={{ color: valB != null ? 'var(--success)' : 'var(--text-muted)' }}>
          {valB != null ? '100.0 % ✓' : 'n/a'}
        </span>
      </div>

      {/* Vainqueur calculé */}
      {winner && (
        <div style={{ borderLeft: '3px solid var(--gold)', paddingLeft: 'var(--sp-4)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--sp-2)' }}>
            Vainqueur calculé automatiquement
          </div>
          <div style={{ fontWeight: 700 }}>{winner} · {winnerScore?.toFixed(1)} %</div>
        </div>
      )}

      <SaveFeedback ok={ok} err={err} />
      <button className="btn btn-primary" type="submit" disabled={saving || !winner} style={{ alignSelf: 'flex-start' }}>
        {saving ? 'Enregistrement…' : 'Enregistrer les scores du 2nd tour'}
      </button>
    </form>
  )
}

// ── Panel principal ───────────────────────────────────────────

function AdminPanel() {
  const {
    session, players, pronosticsMap, results,
    officialCandidatesR1,
    changeSession, saveResults, adminCreatePlayer, adminResetPlayerCode, removePlayer,
    saveOfficialCandidatesR1,
  } = useGame()

  const [newPlayerName, setNewPlayerName] = useState('')
  const [addingPlayer, setAddingPlayer] = useState(false)
  const [addErr, setAddErr] = useState('')
  // Dernier code généré, à transmettre au joueur : { name, code }
  const [issuedCode, setIssuedCode] = useState(null)

  const handleChangeSession = async (s) => {
    if (s === session) return
    if (!confirm(`Passer en Phase ${s} ? Les pronostics de la phase précédente seront gelés.`)) return
    try { await changeSession(s) } catch (e) { alert(e.message) }
  }

  const handleAddPlayer = async (e) => {
    e.preventDefault()
    const name = newPlayerName.trim()
    if (!name) return
    setAddingPlayer(true); setAddErr('')
    try {
      const { player, code } = await adminCreatePlayer(name)
      setIssuedCode({ name: player.name, code })
      setNewPlayerName('')
    }
    catch (e) { setAddErr(e.message?.includes('unique') || e.code === '23505' ? 'Ce nom est déjà pris.' : e.message) }
    finally { setAddingPlayer(false) }
  }

  const handleRemovePlayer = async (p) => {
    if (!confirm(`Supprimer ${p.name} et tous ses pronostics ? Action irréversible.`)) return
    try { await removePlayer(p.id) } catch (e) { alert(e.message) }
  }

  const handleResetCode = async (p) => {
    if (!confirm(`Générer un nouveau code pour ${p.name} ? L'ancien ne fonctionnera plus.`)) return
    try { setIssuedCode({ name: p.name, code: await adminResetPlayerCode(p.id) }) }
    catch (e) { alert(e.message) }
  }

  // Statut de chaque étape
  const step1Done = officialCandidatesR1.length > 0
  const step2Done = results?.scores && Object.keys(results.scores).length > 0
  const step3Done = results?.winnerScore != null

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 700 }}>
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
            Accès restreint
          </div>
          <h2 style={{ marginBottom: 'var(--sp-3)', fontStyle: 'italic' }}>Administration</h2>
          <p style={{ fontFamily: 'var(--font)', fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
            Gestion des phases, joueurs et résultats.
          </p>
        </header>

        {/* Session */}
        <section className="card" style={{ marginBottom: 'var(--sp-6)' }}>
          <h3 style={{ marginBottom: 'var(--sp-4)' }}>Phase active</h3>
          <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
            {[1, 2, 3].map(s => (
              <button key={s} className={`btn ${s === session ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleChangeSession(s)}>
                Phase {s}
              </button>
            ))}
          </div>
          <p className="text-muted text-sm mt-4">
            Phase active : <strong style={{ color: 'var(--text-primary)' }}>{session}</strong>.
            Changer de phase gèle automatiquement les pronostics de la phase précédente.
          </p>
        </section>

        {/* Étape 1 — Candidats du 1er tour */}
        <section className="card" style={{ marginBottom: 'var(--sp-6)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3>Étape 1 : Candidats du 1er tour</h3>
            {step1Done
              ? <span className="badge badge-active">✓ {officialCandidatesR1.length} candidats</span>
              : <span className="badge badge-soon">Avant Phase 2</span>}
          </div>
          <p className="text-muted text-sm" style={{ marginBottom: 'var(--sp-4)' }}>
            Saisissez la liste officielle des candidats. Elle sera affichée aux joueurs en Phase 2 pour les pronostics de scores et de finalistes.
          </p>
          <StepCandidatsR1
            officialCandidatesR1={officialCandidatesR1}
            onSave={saveOfficialCandidatesR1}
          />
        </section>

        {/* Étape 2 — Scores réels du 1er tour */}
        <section className="card" style={{ marginBottom: 'var(--sp-6)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3>Étape 2 : Résultats du 1er tour</h3>
            {step2Done
              ? <span className="badge badge-active">✓ Scores enregistrés</span>
              : <span className="badge badge-soon">Après le 1er tour</span>}
          </div>
          <p className="text-muted text-sm" style={{ marginBottom: 'var(--sp-4)' }}>
            Saisissez le score réel de chaque candidat. Les 2 scores les plus élevés désignent automatiquement les finalistes du 2ème tour, disponibles aux joueurs en Phase 3.
          </p>
          <StepScoresR1
            officialCandidatesR1={officialCandidatesR1}
            results={results}
            onSave={saveResults}
          />
        </section>

        {/* Étape 3 — Scores réels du 2nd tour */}
        <section className="card" style={{ marginBottom: 'var(--sp-6)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3>Étape 3 : Résultats du 2nd tour</h3>
            {step3Done
              ? <span className="badge badge-active">✓ {results.winner} · {results.winnerScore} %</span>
              : <span className="badge badge-soon">Après le 2nd tour</span>}
          </div>
          <p className="text-muted text-sm" style={{ marginBottom: 'var(--sp-4)' }}>
            Saisissez le score réel d'un des deux finalistes. Le vainqueur et le score complémentaire sont calculés automatiquement. Déclenche le calcul final des classements.
          </p>
          <StepScoresR2
            results={results}
            onSave={saveResults}
          />
        </section>

        {/* Joueurs */}
        <section className="card" style={{ marginBottom: 'var(--sp-6)' }}>
          <h3 style={{ marginBottom: 'var(--sp-4)' }}>Joueurs ({players.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
            {players.map(p => (
              <div key={p.id} className="flex items-center justify-between" style={{
                padding: 'var(--sp-3) var(--sp-4)', background: 'var(--bg-3)',
                borderRadius: 'var(--r-sm)', border: '1px solid var(--border)',
              }}>
                <span style={{ fontWeight: 600 }}>{p.name}</span>
                <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleResetCode(p)}>Nouveau code</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleRemovePlayer(p)}>Supprimer</button>
                </div>
              </div>
            ))}
            {players.length === 0 && <p className="text-muted text-sm">Aucun joueur.</p>}
          </div>
          <form onSubmit={handleAddPlayer} style={{ display: 'flex', gap: 'var(--sp-2)' }}>
            <input className="input" placeholder="Nouveau joueur" value={newPlayerName}
              onChange={e => setNewPlayerName(e.target.value)} disabled={addingPlayer} maxLength={50} />
            <button className="btn btn-primary" type="submit" disabled={addingPlayer || !newPlayerName.trim()}>
              Ajouter
            </button>
          </form>
          {addErr && <div className="error-banner mt-2">{addErr}</div>}
          {issuedCode && (
            <div className="mt-4" role="status" style={{
              padding: 'var(--sp-3) var(--sp-4)', background: 'var(--success-dim)',
              border: '1px solid rgba(76,175,125,0.2)', borderRadius: 'var(--r-sm)', fontSize: '0.875rem',
            }}>
              Code de <strong>{issuedCode.name}</strong> : <strong style={{ letterSpacing: '0.2em' }}>{issuedCode.code}</strong>
              {' '}— à lui transmettre, il ne sera plus affiché.
              <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'var(--sp-2)' }} onClick={() => setIssuedCode(null)}>OK</button>
            </div>
          )}
        </section>

        {/* Vue pronostics */}
        <section className="card" style={{ marginBottom: 'var(--sp-6)' }}>
          <h3 style={{ marginBottom: 'var(--sp-4)' }}>Vue lecture : tous les pronostics</h3>
          {players.length === 0 ? (
            <p className="text-muted text-sm">Aucun joueur.</p>
          ) : (
            <PronosticsReadView players={players} pronosticsMap={pronosticsMap} />
          )}
        </section>

      </div>
    </div>
  )
}

// ── Export ────────────────────────────────────────────────────

export default function Admin() {
  const { isAdmin, adminLogin } = useGame()
  if (!isAdmin) return <PinScreen onLogin={adminLogin} />
  return <AdminPanel />
}

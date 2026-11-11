import { useState, useEffect, useCallback, useRef } from 'react'
import PronosticsReadView from '../components/PronosticsReadView'
import { useParams, useNavigate } from 'react-router-dom'
import { useGame } from '../store/GameContext'
import Confetti from '../components/Confetti'
import { CANDIDATE_SUGGESTIONS } from '../data/candidates'

function normalize(str) {
  return str?.trim().toLowerCase() ?? ''
}

// ── Sélection joueur ──────────────────────────────────────────

function PlayerSelector({ players, onSelect, onCreatePlayer }) {
  const [newName, setNewName] = useState('')
  const [newCode, setNewCode] = useState('')
  const [creating, setCreating] = useState(false)
  const [err, setErr] = useState('')

  const handleCreate = async (e) => {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) return
    if (!/^[0-9]{4}$/.test(newCode)) { setErr('Choisis un code de 4 chiffres.'); return }
    setCreating(true); setErr('')
    try {
      const player = await onCreatePlayer(trimmed, newCode)
      onSelect(player)
    } catch (e) {
      setErr(e.message?.includes('unique') || e.code === '23505' ? 'Ce nom est déjà pris.' : e.message)
    } finally { setCreating(false) }
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 600 }}>
        <header style={{ paddingTop: 'var(--sp-10)', paddingBottom: 'var(--sp-6)', borderBottom: '3px solid var(--text-primary)', marginBottom: 'var(--sp-8)' }}>
          <div style={{
            fontFamily: 'var(--font)',
            fontSize: '0.7rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.14em',
            color: 'var(--red)', marginBottom: 'var(--sp-3)',
          }}>
            Pronostics
          </div>
          <h2 style={{ fontStyle: 'italic', marginBottom: 'var(--sp-3)' }}>Qui es-tu ?</h2>
          <p style={{ fontFamily: 'var(--font)', fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
            Sélectionne ton profil ou crée-en un nouveau.
          </p>
        </header>
        <div>
          {players.length > 0 && (
            <div style={{ marginBottom: 'var(--sp-8)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--sp-3)' }}>
                Joueurs existants
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                {players.map(p => (
                  <button key={p.id} className="btn btn-secondary w-full"
                    style={{ justifyContent: 'flex-start', fontSize: '1rem', padding: 'var(--sp-4)' }}
                    onClick={() => onSelect(p)}>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--sp-3)' }}>
              Nouveau joueur
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
              <input className="input" placeholder="Ton prénom ou pseudo" value={newName}
                onChange={e => setNewName(e.target.value)} disabled={creating} maxLength={40}
                style={{ flex: '2 1 180px' }} />
              <input className="input" placeholder="Code (4 chiffres)" value={newCode} type="password"
                inputMode="numeric" autoComplete="new-password" maxLength={4} aria-label="Code secret à 4 chiffres"
                onChange={e => setNewCode(e.target.value.replace(/[^0-9]/g, ''))} disabled={creating}
                style={{ flex: '1 1 120px' }} />
              <button className="btn btn-primary" disabled={creating || !newName.trim() || newCode.length !== 4} type="submit">
                {creating ? '…' : 'Créer'}
              </button>
            </form>
            <p className="text-muted text-sm mt-2">
              Ce code protège tes pronostics : garde-le, il te sera demandé sur un autre appareil.
            </p>
            {err && <div className="error-banner mt-2">{err}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── FrozenView — pronostics gelés de la phase active ─────────

function FrozenView({ player, pronosticsMap, lockedAt, session, onBack }) {
  const date = new Date(lockedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 660 }}>
        <header style={{ paddingTop: 'var(--sp-10)', paddingBottom: 'var(--sp-6)', borderBottom: '3px solid var(--text-primary)', marginBottom: 'var(--sp-8)' }}>
          <div style={{
            fontFamily: 'var(--font)', fontSize: '0.7rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.14em',
            color: 'var(--red)', marginBottom: 'var(--sp-3)',
          }}>
            Phase {session} · Lecture seule
          </div>
          <h2 style={{ fontStyle: 'italic', marginBottom: 'var(--sp-3)' }}>{player.name}</h2>
          <p style={{ fontFamily: 'var(--font)', fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
            Tes pronostics de cette phase sont gelés depuis le {date} : ils ne peuvent plus être modifiés.
          </p>
        </header>
        <PronosticsReadView players={[player]} pronosticsMap={pronosticsMap} />
        <button className="btn btn-secondary mt-4" type="button" onClick={onBack}>Changer de joueur</button>
      </div>
    </div>
  )
}

// ── CodeGate — saisie du code secret d'un joueur ─────────────

function CodeGate({ player, onVerify, onUnlocked, onBack }) {
  const [code, setCode] = useState('')
  const [checking, setChecking] = useState(false)
  const [err, setErr] = useState('')

  const MESSAGES = {
    bad_code: 'Code incorrect.',
    locked: 'Trop d\'essais : réessaie dans 15 minutes.',
    no_code: 'Ce joueur n\'a pas encore de code. Demande-le à l\'admin.',
  }

  const submit = async (e) => {
    e.preventDefault()
    setChecking(true); setErr('')
    try {
      const status = await onVerify(player.id, code)
      if (status === 'ok') onUnlocked()
      else { setErr(MESSAGES[status] ?? 'Erreur.'); setCode('') }
    } catch { setErr('Erreur de connexion.') }
    finally { setChecking(false) }
  }

  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 360, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--sp-8)' }}>
          <div style={{
            fontFamily: 'var(--font)', fontSize: '0.7rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.14em',
            color: 'var(--red)', marginBottom: 'var(--sp-3)',
          }}>
            Pronostics
          </div>
          <h2 style={{ fontStyle: 'italic', marginBottom: 'var(--sp-2)' }}>{player.name}</h2>
          <p style={{ fontFamily: 'var(--font)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Saisis ton code à 4 chiffres pour modifier tes pronostics.
          </p>
        </div>
        <div className="card">
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            <input className="input" type="password" inputMode="numeric" maxLength={4}
              autoComplete="off" placeholder="Code" value={code} autoFocus aria-label="Code secret"
              onChange={e => { setCode(e.target.value.replace(/[^0-9]/g, '')); setErr('') }}
              style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.4em' }} />
            {err && <div className="error-banner">{err}</div>}
            <button className="btn btn-primary w-full" type="submit" disabled={checking || code.length !== 4}>
              {checking ? '…' : 'Continuer'}
            </button>
            <button className="btn btn-secondary w-full" type="button" onClick={onBack}>
              Changer de joueur
            </button>
          </form>
        </div>
        <p className="text-muted text-sm mt-4" style={{ textAlign: 'center' }}>
          Code oublié ? L'admin peut t'en générer un nouveau.
        </p>
      </div>
    </div>
  )
}

// ── CandidateCombobox — single-select réutilisable ────────────
// suggestions : liste de noms proposés (déjà filtrée par le parent)
// value : string (valeur courante)
// onChange(name) : appelé avec le nom sélectionné
// placeholder : texte du champ

function CandidateCombobox({ suggestions, value, onChange, placeholder = 'Chercher ou saisir un candidat…', disabled = false }) {
  const [draft, setDraft] = useState(value ?? '')
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  // Sync draft quand value change depuis l'extérieur
  useEffect(() => { setDraft(value ?? '') }, [value])

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false); setActiveIdx(-1)
        // Restaurer la valeur confirmée si l'utilisateur abandonne
        setDraft(value ?? '')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [value])

  const filtered = suggestions.filter(c =>
    !draft.trim() || normalize(c).includes(normalize(draft))
  ).sort((a, b) => a.localeCompare(b, 'fr'))

  const showCustom = draft.trim() !== '' &&
    !filtered.some(c => normalize(c) === normalize(draft.trim()))

  const allOptions = showCustom
    ? [...filtered, `__custom__${draft.trim()}`]
    : filtered

  const select = (name) => {
    const trimmed = (name ?? draft).trim()
    if (!trimmed) return
    onChange(trimmed)
    setDraft(trimmed)
    setOpen(false)
    setActiveIdx(-1)
    inputRef.current?.blur()
  }

  const onKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true); setActiveIdx(0); e.preventDefault(); return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, allOptions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIdx >= 0 && activeIdx < allOptions.length) {
        const opt = allOptions[activeIdx]
        select(opt.startsWith('__custom__') ? opt.slice(10) : opt)
      } else {
        select(draft)
      }
    } else if (e.key === 'Escape') {
      setOpen(false); setActiveIdx(-1); setDraft(value ?? '')
    }
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        className="input"
        placeholder={placeholder}
        value={draft}
        disabled={disabled}
        onChange={e => { setDraft(e.target.value); setOpen(true); setActiveIdx(-1) }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        autoComplete="off"
      />
      {open && allOptions.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          zIndex: 50,
          background: 'var(--bg-2)',
          border: '1px solid var(--border-mid)',
          borderRadius: '4px',
          maxHeight: '220px',
          overflowY: 'auto',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          {allOptions.map((opt, i) => {
            const isCustom = opt.startsWith('__custom__')
            const label = isCustom ? opt.slice(10) : opt
            const isActive = i === activeIdx
            return (
              <div
                key={opt}
                onMouseDown={e => { e.preventDefault(); select(label) }}
                onMouseEnter={() => setActiveIdx(i)}
                style={isCustom ? {
                  padding: 'var(--sp-2) var(--sp-3)',
                  borderTop: '1px solid var(--border)',
                } : {
                  padding: 'var(--sp-2) var(--sp-3)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  background: isActive ? 'var(--bg-3)' : 'transparent',
                  color: 'var(--text-primary)',
                  transition: 'background 80ms',
                }}
              >
                {isCustom ? (
                  <button type="button" className="btn btn-primary" style={{ width: '100%', fontSize: '0.85rem' }}>
                    + Ajouter « {label} »
                  </button>
                ) : label}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── M1 — tag input multi-select ───────────────────────────────

function M1Input({ value, onChange, locked }) {
  const [removingIdx, setRemovingIdx] = useState(null)

  // Suggestions = liste globale moins les tags déjà ajoutés
  const suggestions = CANDIDATE_SUGGESTIONS.filter(
    c => !value.some(v => normalize(v) === normalize(c))
  )

  const add = (name) => {
    const trimmed = name.trim()
    if (!trimmed) return
    if (value.some(c => normalize(c) === normalize(trimmed))) return
    onChange([...value, trimmed])
  }

  const remove = (idx) => {
    setRemovingIdx(idx)
    setTimeout(() => {
      onChange(value.filter((_, i) => i !== idx))
      setRemovingIdx(null)
    }, 180)
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
        {value.map((c, i) => (
          <span key={c} className={`tag tag-animated ${removingIdx === i ? 'tag-removing' : 'tag-entering'}`}>
            {c}
            {!locked && <button type="button" onClick={() => remove(i)}>×</button>}
          </span>
        ))}
        {value.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Aucun candidat ajouté</span>}
      </div>
      {!locked && (
        <CandidateCombobox
          key={value.length}
          suggestions={suggestions}
          value=""
          onChange={add}
          placeholder="Chercher ou saisir un candidat…"
        />
      )}
    </div>
  )
}


// ── M2 — scores par candidat avec total ───────────────────────

function M2Input({ candidates, value, onChange, locked }) {
  if (!candidates?.length) {
    return <p className="text-muted text-sm">Renseignez d'abord le pronostic 1 (candidats au 1er tour).</p>
  }
  const total = candidates.reduce((sum, c) => {
    const v = parseFloat(value[c])
    return sum + (isNaN(v) ? 0 : v)
  }, 0)
  const totalOk = Math.abs(total - 100) < 0.15

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
      {candidates.map(c => (
        <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
          <span style={{ flex: 1, fontSize: '0.9rem' }}>{c}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <input type="number" step="0.1" min="0" max="100"
              className="input input-sm" style={{ width: 90 }}
              placeholder="0.0" value={value[c] ?? ''}
              disabled={locked}
              onChange={e => onChange({ ...value, [c]: e.target.value })} />
            <span className="text-muted text-sm">%</span>
          </div>
        </div>
      ))}
      <div style={{
        display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
        gap: 'var(--sp-2)', paddingTop: 'var(--sp-2)',
        borderTop: '1px solid var(--border)',
        fontSize: '0.875rem', fontWeight: 700,
      }}>
        <span className="text-muted">Total :</span>
        <span style={{ color: totalOk ? 'var(--success)' : total > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
          {total.toFixed(1)} %
          {totalOk && ' ✓'}
          {!totalOk && total > 0 && ` (écart : ${(total - 100).toFixed(1)}%)`}
        </span>
      </div>
    </div>
  )
}

// ── M3 — 2 finalistes ────────────────────────────────────────

function M3Input({ value, onChange, locked, officialCandidates }) {
  const ensure2 = (arr) => { const a = [...arr]; while (a.length < 2) a.push(''); return a.slice(0, 2) }
  const v = ensure2(value)

  // Si candidats officiels dispo → select, sinon texte libre
  if (officialCandidates?.length) {
    const toggle = (c) => {
      if (locked) return
      const norm = normalize(c)
      const current = v.filter(Boolean)
      if (current.some(x => normalize(x) === norm)) {
        onChange(ensure2(current.filter(x => normalize(x) !== norm)))
      } else if (current.length < 2) {
        onChange(ensure2([...current, c]))
      }
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
        <p className="text-muted text-sm" style={{ marginBottom: 'var(--sp-2)' }}>
          Sélectionnez exactement 2 candidats qualifiés pour le second tour.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
          {officialCandidates.map(c => {
            const selected = v.some(x => normalize(x) === normalize(c))
            return (
              <button key={c} type="button" onClick={() => toggle(c)} disabled={locked}
                style={{
                  padding: 'var(--sp-2) var(--sp-3)',
                  border: `1px solid ${selected ? 'var(--border-strong)' : 'var(--border)'}`,
                  background: selected ? 'var(--bg-4)' : 'var(--bg-2)',
                  color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontFamily: 'var(--font)', fontSize: '0.875rem', fontWeight: 600,
                  cursor: locked ? 'default' : 'pointer', transition: 'all var(--t-fast)',
                }}>
                {selected ? '✓ ' : ''}{c}
              </button>
            )
          })}
        </div>
        {v.filter(Boolean).length > 0 && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 'var(--sp-1)' }}>
            Sélectionnés : {v.filter(Boolean).join(' vs ')}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
      {[0, 1].map(i => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700, minWidth: 24 }}>#{i + 1}</span>
          <div style={{ flex: 1 }}>
            <CandidateCombobox
              suggestions={CANDIDATE_SUGGESTIONS.filter(c => normalize(c) !== normalize(v[1 - i] ?? ''))}
              value={v[i]}
              onChange={name => { const next = ensure2(v); next[i] = name; onChange(next) }}
              placeholder={`Finaliste ${i + 1}`}
              disabled={locked}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── M5 S1/S2 — champ numérique avec score complémentaire ─────

function M5SimpleInput({ value, onChange, finalists }) {
  const scoreA = value !== '' ? parseFloat(value) : null
  const scoreB = scoreA != null && !isNaN(scoreA) ? (100 - scoreA).toFixed(1) : null
  const nameA = finalists?.[0] ?? null
  const nameB = finalists?.[1] ?? null

  if (!nameA) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
        <input type="number" step="0.1" min="0" max="100" className="input"
          placeholder="Ex : 55.4" value={value} onChange={e => onChange(e.target.value)}
          style={{ maxWidth: 160 }} />
        <span className="text-muted text-sm">% pour le vainqueur</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
      <p className="text-muted text-sm">
        Saisissez le score du vainqueur au second tour. Le score du second candidat est calculé automatiquement.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
          <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 600 }}>{nameA}</span>
          <input type="number" step="0.1" min="0" max="100" className="input input-sm"
            placeholder="Ex : 55.4" value={value} onChange={e => onChange(e.target.value)}
            style={{ width: 100 }} />
          <span className="text-muted text-sm">%</span>
        </div>
        {scoreB != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
            <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 600 }}>{nameB}</span>
            <span style={{
              width: 100, textAlign: 'right', padding: 'var(--sp-2) var(--sp-3)',
              background: 'var(--bg-3)', border: '1px solid var(--border)',
              fontSize: '0.875rem', color: 'var(--text-muted)',
            }}>
              {scoreB}
            </span>
            <span className="text-muted text-sm">%</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── M5 S3 — deux finalistes avec somme = 100 ─────────────────

function M5FinalistsInput({ finalists, value, onChange }) {
  // value = score du finaliste A (number string)
  // score B = 100 - A (auto)
  const scoreA = value !== '' ? parseFloat(value) : null
  const scoreB = scoreA != null && !isNaN(scoreA) ? (100 - scoreA).toFixed(1) : 'n/a'
  const sum = scoreA != null && !isNaN(scoreA) ? scoreA + (100 - scoreA) : null
  const nameA = finalists[0] ?? 'Finaliste A'
  const nameB = finalists[1] ?? 'Finaliste B'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <p className="text-muted text-sm">
        Saisissez le score du premier finaliste. Le score du second est calculé automatiquement (somme = 100 %).
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
          <span style={{ flex: 1, fontWeight: 600 }}>{nameA}</span>
          <input type="number" step="0.1" min="0" max="100" className="input input-sm"
            style={{ width: 100 }} placeholder="0.0" value={value}
            onChange={e => onChange(e.target.value)} />
          <span className="text-muted text-sm">%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
          <span style={{ flex: 1, fontWeight: 600 }}>{nameB}</span>
          <span style={{
            width: 100, textAlign: 'right', padding: 'var(--sp-2) var(--sp-3)',
            background: 'var(--bg-3)', border: '1px solid var(--border)',
            fontSize: '0.875rem', color: 'var(--text-muted)',
          }}>
            {scoreB}
          </span>
          <span className="text-muted text-sm">%</span>
        </div>
      </div>
      <div style={{
        display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
        gap: 'var(--sp-2)', fontSize: '0.875rem', fontWeight: 700,
        paddingTop: 'var(--sp-2)', borderTop: '1px solid var(--border)',
      }}>
        <span className="text-muted">Total :</span>
        <span style={{ color: sum === 100 ? 'var(--success)' : 'var(--text-muted)' }}>
          {sum != null ? `${sum.toFixed(1)} %` : 'n/a'} {sum === 100 && '✓'}
        </span>
      </div>
    </div>
  )
}

// ── Bloc manche ───────────────────────────────────────────────

function MancheBlock({ num, title, children, prevSessionValue, prevSessionLabel, isOpen, lockedLabel }) {
  return (
    <div className="card" style={{
      borderColor: isOpen ? 'var(--border-mid)' : 'rgba(245,240,232,0.04)',
      opacity: isOpen ? 1 : 0.45,
    }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 900,
            fontStyle: 'italic',
            fontSize: '1.1rem',
            color: isOpen ? 'var(--text-primary)' : 'var(--text-muted)',
            minWidth: 28,
          }}>
            {num}
          </div>
          <span style={{ fontWeight: 700 }}>{title}</span>
        </div>
        {lockedLabel && <span className="badge badge-done">{lockedLabel}</span>}
        {!isOpen && !lockedLabel && <span className="text-xs text-muted">Non disponible cette phase</span>}
      </div>

      {isOpen && children}

      {prevSessionValue && (
        <div style={{ marginTop: 'var(--sp-4)', paddingTop: 'var(--sp-4)', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--sp-2)', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <span className="badge badge-session1">{prevSessionLabel ?? 'Phase précédente'}</span>
            <span>Pronostic gelé</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{prevSessionValue}</div>
        </div>
      )}
    </div>
  )
}

function formatPrevValue(num, pro) {
  if (!pro) return null
  switch (num) {
    case 1: return pro.m1?.length ? pro.m1.join(', ') : null
    case 2: return pro.m2 && Object.keys(pro.m2).length
      ? Object.entries(pro.m2).map(([k, v]) => `${k} : ${v}%`).join(' · ') : null
    case 3: return pro.m3?.filter(Boolean).length ? pro.m3.filter(Boolean).join(' vs ') : null
    case 4: return pro.m4 || null
    case 5: return pro.m5 != null ? `${pro.m5}%` : null
    default: return null
  }
}

// ── Page principale ───────────────────────────────────────────

export default function Pronostics() {
  const { playerId: routePlayerId } = useParams()
  const navigate = useNavigate()
  const { session, players, pronosticsMap, upsertPronostic, addPlayer, officialCandidatesR1, officialFinalists,
    getPlayerCode, verifyPlayerCode } = useGame()

  const [player, setPlayer] = useState(null)
  const [form, setForm] = useState({ m1: [], m2: {}, m3: ['', ''], m4: '', m5: '' })
  const saveTimer = useRef(null)
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState('')
  const [unlockedId, setUnlockedId] = useState(null)

  useEffect(() => {
    if (routePlayerId && players.length) {
      const found = players.find(p => p.id === routePlayerId)
      if (found) setPlayer(found)
    }
  }, [routePlayerId, players])

  useEffect(() => {
    if (!player) return
    const pMap = pronosticsMap[player.id] || {}
    const current = pMap[`s${session}`] || {}
    setForm({
      m1: current.m1 ?? [],
      m2: current.m2 ?? {},
      m3: current.m3?.length ? current.m3 : ['', ''],
      m4: current.m4 ?? '',
      m5: current.m5 != null ? String(current.m5) : '',
    })
  }, [player, pronosticsMap, session])

  const scheduleSave = useCallback((newForm) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!player) return
      setSaving(true); setSaveErr('')
      try {
        await upsertPronostic(player.id, session, {
          m1: newForm.m1,
          m2: newForm.m2,
          m3: newForm.m3.filter(Boolean),
          m4: newForm.m4,
          m5: newForm.m5 !== '' ? parseFloat(newForm.m5) : null,
        })
      } catch (e) {
        setSaveErr(e.message || 'Erreur de sauvegarde')
        if (e.code === 'bad_code' || e.code === 'no_code') setUnlockedId(null)
      }
      finally { setSaving(false) }
    }, 700)
  }, [player, session, upsertPronostic])

  // Calcule les deux finalistes depuis les scores M2
  const deriveFinalists = (m1, m2) => {
    const scored = m1
      .map(c => ({ name: c, score: parseFloat(m2[c]) }))
      .filter(x => !isNaN(x.score))
      .sort((a, b) => b.score - a.score)
    if (scored.length < 2) return null
    return [scored[0].name, scored[1].name]
  }

  const update = (patch) => {
    const next = { ...form, ...patch }
    // Auto-dériver les finalistes si M1 ou M2 changent
    // En phase 2, la liste de référence est officialCandidatesR1 (pas form.m1)
    if ('m1' in patch || 'm2' in patch) {
      const candidateList = session >= 2 && officialCandidatesR1.length ? officialCandidatesR1 : next.m1
      const derived = deriveFinalists(candidateList, next.m2)
      if (derived) next.m3 = derived
    }
    setForm(next)
    scheduleSave(next)
  }

  const [transitioning, setTransitioning] = useState(false)

  const handleSelectPlayer = (p) => {
    setTransitioning(true)
    setTimeout(() => {
      setPlayer(p)
      navigate(`/pronostics/${p.id}`, { replace: true })
      setTransitioning(false)
    }, 220)
  }

  const pMap = pronosticsMap[player?.id] || {}
  const s1 = pMap.s1 ?? null
  const s2 = pMap.s2 ?? null

  if (!player) {
    return (
      <div className={transitioning ? 'page-fade-out' : 'page-fade-in'}>
        <PlayerSelector players={players} onSelect={handleSelectPlayer} onCreatePlayer={addPlayer} />
      </div>
    )
  }

  const frozenAt = pMap[`s${session}`]?.lockedAt
  if (frozenAt) {
    return (
      <FrozenView player={player} pronosticsMap={pronosticsMap} lockedAt={frozenAt} session={session}
        onBack={() => { setPlayer(null); navigate('/pronostics') }} />
    )
  }

  if (unlockedId !== player.id && !getPlayerCode(player.id)) {
    return (
      <CodeGate player={player} onVerify={verifyPlayerCode}
        onUnlocked={() => { setUnlockedId(player.id); setSaveErr('') }}
        onBack={() => { setPlayer(null); navigate('/pronostics') }} />
    )
  }

  // ── Session 1 ─────────────────────────────────────────────

  if (session === 1) {
    return (
      <PronosticsLayout player={player} session={session} form={form} officialCandidatesR1={officialCandidatesR1} saving={saving} saveErr={saveErr}
        onChangePlayer={() => { setPlayer(null); navigate('/pronostics') }}>
        <MancheBlock num={1} title="Candidats au 1er tour" isOpen>
          <M1Input value={form.m1} onChange={m1 => update({ m1 })} locked={false} />
        </MancheBlock>
        <MancheBlock num={2} title="Scores du 1er tour" isOpen>
          <M2Input candidates={form.m1} value={form.m2} onChange={m2 => update({ m2 })} locked={false} />
        </MancheBlock>
        <MancheBlock num={3} title="Les deux finalistes" isOpen>
          <M3Input value={form.m3} onChange={m3 => update({ m3 })} locked={false} officialCandidates={null} />
        </MancheBlock>
        <MancheBlock num={4} title="Vainqueur de l'élection" isOpen>
          <CandidateCombobox
            suggestions={form.m3.filter(Boolean).length ? form.m3.filter(Boolean) : CANDIDATE_SUGGESTIONS}
            value={form.m4}
            onChange={m4 => update({ m4 })}
            placeholder="Nom du candidat vainqueur"
          />
        </MancheBlock>
        <MancheBlock num={5} title="Score du second tour" isOpen>
          <M5SimpleInput value={form.m5} onChange={m5 => update({ m5 })} finalists={form.m3.filter(Boolean)} />
        </MancheBlock>
      </PronosticsLayout>
    )
  }

  // ── Session 2 ─────────────────────────────────────────────

  if (session === 2) {
    const hasOfficial = officialCandidatesR1.length > 0
    return (
      <PronosticsLayout player={player} session={session} form={form} officialCandidatesR1={officialCandidatesR1} saving={saving} saveErr={saveErr}
        onChangePlayer={() => { setPlayer(null); navigate('/pronostics') }}>

        {/* Candidats imposés — pas de pronostic à saisir */}
        <div className="card" style={{ opacity: 0.6 }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 900, fontStyle: 'italic', fontSize: '1.1rem', color: 'var(--text-muted)', minWidth: 28 }}>1</div>
              <span style={{ fontWeight: 700 }}>Candidats au 1er tour</span>
            </div>
            <span className="badge badge-done">Imposés</span>
          </div>
          {hasOfficial ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
              {officialCandidatesR1.map(c => (
                <span key={c} className="tag">{c}</span>
              ))}
            </div>
          ) : (
            <p className="text-muted text-sm">En attente de la liste officielle (admin).</p>
          )}
        </div>

        {/* M2 S2 — sur candidats officiels */}
        <MancheBlock num={2} title="Scores du 1er tour" isOpen
          prevSessionValue={formatPrevValue(2, s1)} prevSessionLabel="Phase 1">
          {hasOfficial
            ? <M2Input candidates={officialCandidatesR1} value={form.m2} onChange={m2 => update({ m2 })} locked={false} />
            : <p className="text-muted text-sm">En attente de la liste officielle des candidats (admin).</p>
          }
        </MancheBlock>

        {/* M3 S2 */}
        <MancheBlock num={3} title="Les deux finalistes" isOpen
          prevSessionValue={formatPrevValue(3, s1)} prevSessionLabel="Phase 1">
          <M3Input value={form.m3} onChange={m3 => update({ m3 })} locked={false}
            officialCandidates={hasOfficial ? officialCandidatesR1 : null} />
        </MancheBlock>

        {/* M4 S2 */}
        <MancheBlock num={4} title="Vainqueur de l'élection" isOpen
          prevSessionValue={formatPrevValue(4, s1)} prevSessionLabel="Phase 1">
          <CandidateCombobox
            suggestions={form.m3.filter(Boolean).length ? form.m3.filter(Boolean) : (hasOfficial ? officialCandidatesR1 : CANDIDATE_SUGGESTIONS)}
            value={form.m4}
            onChange={m4 => update({ m4 })}
            placeholder="Nom du candidat vainqueur"
          />
        </MancheBlock>

        {/* M5 S2 */}
        <MancheBlock num={5} title="Score du second tour" isOpen
          prevSessionValue={formatPrevValue(5, s1)} prevSessionLabel="Phase 1">
          <M5SimpleInput value={form.m5} onChange={m5 => update({ m5 })} finalists={form.m3.filter(Boolean)} />
        </MancheBlock>
      </PronosticsLayout>
    )
  }

  // ── Session 3 — uniquement M5 avec les deux finalistes ────

  if (session === 3) {
    const hasFinalists = officialFinalists.length === 2
    return (
      <PronosticsLayout player={player} session={session} form={form} officialCandidatesR1={officialCandidatesR1} saving={saving} saveErr={saveErr}
        onChangePlayer={() => { setPlayer(null); navigate('/pronostics') }}>
        <div style={{ borderLeft: '3px solid var(--gold)', paddingLeft: 'var(--sp-4)', marginBottom: 'var(--sp-4)' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--gold)', margin: 0, fontWeight: 600 }}>
            Phase 3 : seul le pronostic 5 est ouvert. Attribuez un score à chaque finaliste.
          </p>
        </div>

        <MancheBlock num={1} title="Candidats au 1er tour" isOpen={false} />
        <MancheBlock num={2} title="Scores du 1er tour" isOpen={false} />
        <MancheBlock num={3} title="Les deux finalistes" isOpen={false} />
        <MancheBlock num={4} title="Vainqueur de l'élection" isOpen={false} />

        <MancheBlock num={5} title="Score du second tour" isOpen
          prevSessionValue={formatPrevValue(5, s2 || s1)}
          prevSessionLabel={s2 ? 'Phase 2' : 'Phase 1'}>
          {hasFinalists
            ? <M5FinalistsInput finalists={officialFinalists} value={form.m5} onChange={m5 => update({ m5 })} />
            : <p className="text-muted text-sm">En attente des finalistes officiels (admin).</p>
          }
        </MancheBlock>
      </PronosticsLayout>
    )
  }

  return null
}

// ── Indicateur de sauvegarde ─────────────────────────────────

function SaveIndicator({ saving }) {
  return (
    <span className={`save-indicator ${saving ? 'save-indicator-saving' : 'save-indicator-saved'}`}>
      {saving ? <><span className="save-dot" />Sauvegarde…</> : '✓ Sauvegarde auto'}
    </span>
  )
}

// ── Barre de progression ──────────────────────────────────────

function ProgressBar({ form, session, officialCandidatesR1, playerId }) {
  // Calcule quels pronostics sont remplis selon la phase
  const checks = session === 3
    ? [form.m5 !== '']
    : [
        session === 1 ? form.m1.length > 0 : officialCandidatesR1.length > 0,
        Object.values(form.m2).some(v => v !== ''),
        form.m3.filter(Boolean).length === 2,
        form.m4.trim() !== '',
        form.m5 !== '',
      ]

  const filled = checks.filter(Boolean).length
  const total = checks.length
  const pct = Math.round((filled / total) * 100)
  const allDone = filled === total

  // Confetti — une seule fois par joueur × phase
  const [showConfetti, setShowConfetti] = useState(false)
  const confettiKey = `confetti-${playerId}-s${session}`
  const prevAllDone = useRef(false)
  useEffect(() => {
    if (allDone && !prevAllDone.current && !localStorage.getItem(confettiKey)) {
      setShowConfetti(true)
      localStorage.setItem(confettiKey, '1')
    }
    prevAllDone.current = allDone
  }, [allDone, confettiKey])

  return (
    <>
    {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}
    <div style={{ marginBottom: 'var(--sp-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-2)' }}>
        <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
          {checks.map((done, i) => (
            <div key={i} style={{
              width: 20, height: 20,
              border: `1px solid ${done ? 'var(--success)' : 'var(--border-mid)'}`,
              background: done ? 'var(--success-dim)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.65rem', fontWeight: 700,
              color: done ? 'var(--success)' : 'var(--text-muted)',
              transition: 'all 300ms ease',
            }}>
              {done ? '✓' : i + 1}
            </div>
          ))}
        </div>
        <span style={{
          fontSize: '0.72rem', fontWeight: 700,
          fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: '0.08em',
          color: allDone ? 'var(--success)' : 'var(--text-muted)',
          transition: 'color 300ms ease',
        }}>
          {allDone ? 'Complet ✓' : `${filled}/${total}`}
        </span>
      </div>
      <div style={{ height: 2, background: 'var(--border)', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, height: '100%',
          width: `${pct}%`,
          background: allDone ? 'var(--success)' : 'var(--red)',
          transition: 'width 400ms cubic-bezier(0.4, 0, 0.2, 1), background 300ms ease',
        }} />
      </div>
    </div>
    </>
  )
}

// ── Wrapper layout commun ─────────────────────────────────────

function PronosticsLayout({ player, session, form, officialCandidatesR1, saving, saveErr, onChangePlayer, children }) {
  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 700 }}>
        <header style={{ paddingTop: 'var(--sp-10)', paddingBottom: 'var(--sp-6)', borderBottom: '3px solid var(--text-primary)', marginBottom: 'var(--sp-6)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{
                fontFamily: 'var(--font)',
                fontSize: '0.7rem', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.14em',
                color: 'var(--red)', marginBottom: 'var(--sp-2)',
              }}>
                Phase {session}
              </div>
              <h2 style={{ fontStyle: 'italic', marginBottom: 'var(--sp-1)' }}>Pronostics de {player.name}</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', paddingTop: 'var(--sp-2)' }}>
              <SaveIndicator saving={saving} />
              <button className="btn btn-ghost btn-sm" onClick={onChangePlayer}>Changer</button>
            </div>
          </div>
          <div style={{ marginTop: 'var(--sp-5)' }}>
            <ProgressBar form={form} session={session} officialCandidatesR1={officialCandidatesR1} playerId={player.id} />
          </div>
        </header>
        {saveErr && <div className="error-banner mb-4">{saveErr}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

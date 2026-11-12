import { useState, useEffect, useRef } from 'react'
import { CANDIDATE_SUGGESTIONS } from '../data/candidates'

// Champs de saisie des pronostics, partagés par les pages de saisie.

function normalize(str) {
  return str?.trim().toLowerCase() ?? ''
}

// ── CandidateCombobox — single-select réutilisable ────────────
// suggestions : liste de noms proposés (déjà filtrée par le parent)
// value : string (valeur courante)
// onChange(name) : appelé avec le nom sélectionné
// placeholder : texte du champ

export function CandidateCombobox({ suggestions, value, onChange, placeholder = 'Chercher ou saisir un candidat…', disabled = false }) {
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

export function M1Input({ value, onChange, locked }) {
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

export function M2Input({ candidates, value, onChange, locked }) {
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

export function M3Input({ value, onChange, locked, officialCandidates }) {
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

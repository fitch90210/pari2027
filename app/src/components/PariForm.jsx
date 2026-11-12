import { useState } from 'react'
import { CANDIDATE_SUGGESTIONS } from '../data/candidates'
import { CandidateCombobox, M1Input, M2Input, M3Input } from './PronosticInputs'
import { valeursPourEnvoi, estRempli } from '../lib/pari'

function Bloc({ num, title, children }) {
  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-4">
        <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 900, fontStyle: 'italic', fontSize: '1.1rem', minWidth: 28 }}>{num}</div>
        <span style={{ fontWeight: 700 }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

// ── Formulaire d'un pari (nouveau ou correction) ──────────────

export default function PariForm({ periode, initial, officiels, finalistesOfficiels, onSubmit, onCancel, submitLabel, intro }) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const ouvert = (k) => periode.scored.includes(k)
  const listeOfficielleManquante = periode.id >= 3 && ouvert('m2') && officiels.length === 0

  const deriveFinalistes = (candidats, m2) => {
    const scored = candidats
      .map(c => ({ name: c, score: parseFloat(m2[c]) }))
      .filter(x => !isNaN(x.score))
      .sort((a, b) => b.score - a.score)
    return scored.length < 2 ? null : [scored[0].name, scored[1].name]
  }

  const update = (patch) => {
    const next = { ...form, ...patch }
    if (('m1' in patch || 'm2' in patch) && ouvert('m3')) {
      const derived = deriveFinalistes(periode.id >= 3 ? officiels : next.m1, next.m2)
      if (derived) next.m3 = derived
    }
    setForm(next)
  }

  const valeurs = valeursPourEnvoi(form, periode, officiels)
  const total = Object.values(valeurs.m2).reduce((a, b) => a + b, 0)
  const m2Incomplet = ouvert('m2') && Object.keys(valeurs.m2).length > 0 && Math.abs(total - 100) >= 0.15

  const submit = async (e) => {
    e.preventDefault()
    if (!estRempli(valeurs)) { setErr('Remplis au moins un pronostic.'); return }
    setSaving(true); setErr('')
    try { await onSubmit(valeurs) }
    catch (e) { setErr(e.message || 'Erreur de sauvegarde') }
    finally { setSaving(false) }
  }

  const suggestionsVainqueur = form.m3.filter(Boolean).length
    ? form.m3.filter(Boolean)
    : finalistesOfficiels.length === 2 ? finalistesOfficiels
    : officiels.length ? officiels : CANDIDATE_SUGGESTIONS

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      {intro && <p className="text-muted text-sm" style={{ margin: 0 }}>{intro}</p>}

      {ouvert('m1') && (
        <Bloc num={1} title="Candidats au 1er tour">
          <M1Input value={form.m1} onChange={m1 => update({ m1 })} locked={false} />
        </Bloc>
      )}
      {ouvert('m2') && (
        <Bloc num={2} title="Scores du 1er tour">
          {listeOfficielleManquante
            ? <p className="text-muted text-sm">En attente de la liste officielle des candidats (admin) : tu ne peux pas encore poser de pari.</p>
            : <M2Input candidates={periode.id >= 3 ? officiels : form.m1} value={form.m2} onChange={m2 => update({ m2 })} locked={false} />}
        </Bloc>
      )}
      {ouvert('m3') && (
        <Bloc num={3} title="Les deux finalistes">
          <M3Input value={form.m3} onChange={m3 => update({ m3 })} locked={false}
            officialCandidates={periode.id >= 3 && officiels.length ? officiels : null} />
        </Bloc>
      )}
      {ouvert('m4') && (
        <Bloc num={4} title="Vainqueur de l'élection">
          <CandidateCombobox suggestions={suggestionsVainqueur} value={form.m4}
            onChange={m4 => update({ m4 })} placeholder="Nom du candidat vainqueur" />
        </Bloc>
      )}
      {ouvert('m5') && (
        <Bloc num={5} title="Score du vainqueur au second tour">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
            <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 600 }}>{form.m4 || 'Le vainqueur'}</span>
            <input type="number" step="0.1" min="0" max="100" className="input input-sm" style={{ width: 100 }}
              placeholder="Ex : 55.4" value={form.m5} onChange={e => update({ m5: e.target.value })} />
            <span className="text-muted text-sm">%</span>
          </div>
        </Bloc>
      )}

      {m2Incomplet && (
        <div className="error-banner">
          Les scores du 1er tour font {total.toFixed(1)} % au lieu de 100 %. Tu peux enregistrer quand même.
        </div>
      )}
      {err && <div className="error-banner">{err}</div>}
      <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
        <button className="btn btn-primary" type="submit" disabled={saving || listeOfficielleManquante}>
          {saving ? '…' : submitLabel}
        </button>
        {onCancel && <button className="btn btn-secondary" type="button" onClick={onCancel} disabled={saving}>Annuler</button>}
      </div>
    </form>
  )
}

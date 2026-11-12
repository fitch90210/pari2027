import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGame } from '../store/GameContext'
import { CANDIDATE_SUGGESTIONS } from '../data/candidates'
import { CandidateCombobox, M1Input, M2Input, M3Input } from '../components/PronosticInputs'

// Page « Mes paris » : la liste datée de mes paris, un nouveau pari pré-rempli
// avec le dernier, et la correction d'un pari de moins de 24 h.

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
            Paris
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
            Paris
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

// ── Outils ────────────────────────────────────────────────────

const FENETRE_MS = 24 * 3600 * 1000
const VIDE = { m1: [], m2: {}, m3: ['', ''], m4: '', m5: '' }

const fmtDate = (iso) => new Date(iso).toLocaleString('fr-FR', {
  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  timeZone: 'Europe/Paris',
})
const fmtJour = (iso) => new Date(iso).toLocaleDateString('fr-FR', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris',
})

// Formulaire pré-rempli depuis un pari, limité aux pronostics ouverts de la période.
function formDepuis(pari, periode, officiels) {
  if (!pari) return VIDE
  const ouvert = (k) => periode.scored.includes(k)
  let m2 = ouvert('m2') ? (pari.m2 ?? {}) : {}
  // Dès la période 3, seuls les candidats officiels sont acceptés par le serveur
  if (periode.id >= 3) m2 = Object.fromEntries(Object.entries(m2).filter(([c]) => officiels.includes(c)))
  return {
    m1: ouvert('m1') ? (pari.m1 ?? []) : [],
    m2: Object.fromEntries(Object.entries(m2).map(([c, v]) => [c, String(v)])),
    m3: ouvert('m3') && pari.m3?.length ? [...pari.m3, '', ''].slice(0, 2) : ['', ''],
    m4: ouvert('m4') ? (pari.m4 ?? '') : '',
    m5: ouvert('m5') && pari.m5 != null ? String(pari.m5) : '',
  }
}

// Valeurs envoyées au serveur (qui remet de toute façon à vide les pronostics fermés).
function valeursPourEnvoi(form, periode, officiels) {
  const candidats = periode.id >= 3 ? officiels : form.m1
  const m2 = Object.fromEntries(
    Object.entries(form.m2)
      .filter(([c, v]) => candidats.includes(c) && v !== '' && !isNaN(parseFloat(v)))
      .map(([c, v]) => [c, parseFloat(v)])
  )
  return {
    m1: form.m1,
    m2,
    m3: form.m3.filter(Boolean),
    m4: form.m4.trim(),
    m5: form.m5 !== '' && !isNaN(parseFloat(form.m5)) ? parseFloat(form.m5) : null,
  }
}

function estRempli(v) {
  return v.m1.length > 0 || Object.keys(v.m2).length > 0 || v.m3.length > 0 || v.m4 !== '' || v.m5 != null
}

function Resume({ pari }) {
  const lignes = [
    pari.m1?.length ? ['Candidats', pari.m1.join(', ')] : null,
    pari.m2 && Object.keys(pari.m2).length
      ? ['Scores', Object.entries(pari.m2).map(([k, v]) => `${k} ${v} %`).join(' · ')] : null,
    pari.m3?.filter(Boolean).length ? ['Finalistes', pari.m3.filter(Boolean).join(' vs ')] : null,
    pari.m4 ? ['Vainqueur', pari.m4] : null,
    pari.m5 != null ? ['Score du vainqueur', `${pari.m5} %`] : null,
  ].filter(Boolean)
  return (
    <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: 'var(--sp-1) var(--sp-4)', fontSize: '0.85rem' }}>
      {lignes.map(([k, v]) => (
        <div key={k} style={{ display: 'contents' }}>
          <dt className="text-muted">{k}</dt>
          <dd style={{ margin: 0 }}>{v}</dd>
        </div>
      ))}
    </dl>
  )
}

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

function PariForm({ periode, initial, officiels, finalistesOfficiels, onSubmit, onCancel, submitLabel, intro }) {
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
    catch (e) { setErr(e.message || 'Erreur de sauvegarde'); setSaving(false) }
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
        <button className="btn btn-secondary" type="button" onClick={onCancel} disabled={saving}>Annuler</button>
      </div>
    </form>
  )
}

// ── Page « Mes paris » ────────────────────────────────────────

export default function Pronostics() {
  const { playerId: routePlayerId } = useParams()
  const navigate = useNavigate()
  const { players, paris, periodes, periodeEnCours, now, createPari, updatePari, addPlayer,
    officialCandidatesR1, officialFinalists, getPlayerCode, verifyPlayerCode } = useGame()

  const [playerId, setPlayerId] = useState(routePlayerId ?? null)
  const [unlockedId, setUnlockedId] = useState(null)
  const [mode, setMode] = useState(null) // null | { type: 'new' } | { type: 'edit', pari }
  const [confirmation, setConfirmation] = useState('')

  const player = players.find(p => p.id === playerId) ?? null
  const retour = () => { setPlayerId(null); setMode(null); setConfirmation(''); navigate('/pronostics') }

  if (!player) {
    return (
      <div className="page-fade-in">
        <PlayerSelector players={players} onCreatePlayer={addPlayer}
          onSelect={(p) => { setPlayerId(p.id); navigate(`/pronostics/${p.id}`, { replace: true }) }} />
      </div>
    )
  }

  if (unlockedId !== player.id && !getPlayerCode(player.id)) {
    return <CodeGate player={player} onVerify={verifyPlayerCode} onUnlocked={() => setUnlockedId(player.id)} onBack={retour} />
  }

  const mesParis = paris
    .filter(p => p.player_id === player.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at) || b.id - a.id)
  const dernier = mesParis[0] ?? null
  const periodeDe = (pari) => periodes.find(p => p.id === pari.periode)
  const modifiable = (pari) =>
    periodeEnCours?.id === pari.periode && new Date(pari.created_at).getTime() > now - FENETRE_MS
  const heuresRestantes = (pari) =>
    Math.max(1, Math.ceil((new Date(pari.created_at).getTime() + FENETRE_MS - now) / 3600000))

  const initialNouveau = periodeEnCours ? formDepuis(dernier, periodeEnCours, officialCandidatesR1) : VIDE
  const termine = () => { setMode(null); setConfirmation('Pari enregistré.') }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 700 }}>
        <header style={{ paddingTop: 'var(--sp-10)', paddingBottom: 'var(--sp-6)', borderBottom: '3px solid var(--text-primary)', marginBottom: 'var(--sp-6)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--sp-3)' }}>
            <div>
              <div style={{
                fontFamily: 'var(--font)', fontSize: '0.7rem', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--red)', marginBottom: 'var(--sp-2)',
              }}>
                {periodeEnCours ? `Période ${periodeEnCours.id} · ${periodeEnCours.label}` : 'Jeu fermé'}
              </div>
              <h2 style={{ fontStyle: 'italic', marginBottom: 'var(--sp-1)' }}>Paris de {player.name}</h2>
              {periodeEnCours && (
                <p className="text-muted text-sm" style={{ margin: 0 }}>
                  Cette période se termine le {fmtJour(periodeEnCours.ends_at)}.
                </p>
              )}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={retour}>Changer</button>
          </div>
        </header>

        {confirmation && <div className="card mb-4" style={{ borderColor: 'var(--success)' }}>{confirmation}</div>}

        {mode ? (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>{mode.type === 'new' ? 'Nouveau pari' : 'Corriger ce pari'}</h3>
            <PariForm
              key={mode.type === 'edit' ? mode.pari.id : 'new'}
              periode={mode.type === 'edit' ? periodeDe(mode.pari) : periodeEnCours}
              initial={mode.type === 'edit'
                ? formDepuis(mode.pari, periodeDe(mode.pari), officialCandidatesR1)
                : initialNouveau}
              officiels={officialCandidatesR1}
              finalistesOfficiels={officialFinalists}
              intro={mode.type === 'new'
                ? (dernier ? 'Pré-rempli avec ton dernier pari. Ce nouveau pari sera daté d\'aujourd\'hui et modifiable pendant 24 h.' : 'Ce pari sera daté d\'aujourd\'hui et modifiable pendant 24 h.')
                : 'Tu peux corriger ce pari pendant 24 h après sa création.'}
              submitLabel={mode.type === 'new' ? 'Enregistrer le pari' : 'Enregistrer la correction'}
              onCancel={() => setMode(null)}
              onSubmit={async (valeurs) => {
                if (mode.type === 'new') await createPari(player.id, valeurs)
                else await updatePari(mode.pari.id, player.id, valeurs)
                termine()
              }}
            />
          </div>
        ) : (
          <>
            {periodeEnCours ? (
              <button className="btn btn-primary mb-4" onClick={() => { setConfirmation(''); setMode({ type: 'new' }) }}>
                Nouveau pari
              </button>
            ) : (
              <div className="card mb-4">Le jeu est fermé : il n'est plus possible de poser un pari.</div>
            )}

            {mesParis.length === 0 ? (
              <div className="card text-muted">Tu n'as encore posé aucun pari.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
                {mesParis.map((pari, i) => (
                  <div key={pari.id} className="card">
                    <div className="flex items-center justify-between mb-4" style={{ gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
                      <div>
                        <strong>{fmtDate(pari.created_at)}</strong>
                        <span className="badge badge-session1" style={{ marginLeft: 'var(--sp-3)' }}>
                          Période {pari.periode}{periodeDe(pari) ? ` · ${periodeDe(pari).label}` : ''}
                        </span>
                        {i === 0 && <span className="badge badge-done" style={{ marginLeft: 'var(--sp-2)' }}>Dernier pari</span>}
                      </div>
                      {modifiable(pari) && (
                        <button className="btn btn-secondary btn-sm"
                          onClick={() => { setConfirmation(''); setMode({ type: 'edit', pari }) }}>
                          Corriger (encore {heuresRestantes(pari)} h)
                        </button>
                      )}
                    </div>
                    <Resume pari={pari} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

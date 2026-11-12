import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGame } from '../store/GameContext'
import PariForm from '../components/PariForm'
import { VIDE, formDepuis } from '../lib/pari'

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
        <header style={{ paddingTop: 'var(--v1-sp-10)', paddingBottom: 'var(--v1-sp-6)', borderBottom: '3px solid var(--v1-text-primary)', marginBottom: 'var(--v1-sp-8)' }}>
          <div style={{
            fontFamily: 'var(--v1-font)',
            fontSize: '0.7rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.14em',
            color: 'var(--v1-red)', marginBottom: 'var(--v1-sp-3)',
          }}>
            Paris
          </div>
          <h2 style={{ fontStyle: 'italic', marginBottom: 'var(--v1-sp-3)' }}>Qui es-tu ?</h2>
          <p style={{ fontFamily: 'var(--v1-font)', fontSize: '0.875rem', color: 'var(--v1-text-secondary)', margin: 0 }}>
            Sélectionne ton profil ou crée-en un nouveau.
          </p>
        </header>
        <div>
          {players.length > 0 && (
            <div style={{ marginBottom: 'var(--v1-sp-8)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--v1-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--v1-sp-3)' }}>
                Joueurs existants
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--v1-sp-2)' }}>
                {players.map(p => (
                  <button key={p.id} className="btn btn-secondary w-full"
                    style={{ justifyContent: 'flex-start', fontSize: '1rem', padding: 'var(--v1-sp-4)' }}
                    onClick={() => onSelect(p)}>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--v1-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--v1-sp-3)' }}>
              Nouveau joueur
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', gap: 'var(--v1-sp-2)', flexWrap: 'wrap' }}>
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
        <div style={{ textAlign: 'center', marginBottom: 'var(--v1-sp-8)' }}>
          <div style={{
            fontFamily: 'var(--v1-font)', fontSize: '0.7rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.14em',
            color: 'var(--v1-red)', marginBottom: 'var(--v1-sp-3)',
          }}>
            Paris
          </div>
          <h2 style={{ fontStyle: 'italic', marginBottom: 'var(--v1-sp-2)' }}>{player.name}</h2>
          <p style={{ fontFamily: 'var(--v1-font)', fontSize: '0.875rem', color: 'var(--v1-text-secondary)' }}>
            Saisis ton code à 4 chiffres pour modifier tes pronostics.
          </p>
        </div>
        <div className="card">
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--v1-sp-3)' }}>
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
const fmtDate = (iso) => new Date(iso).toLocaleString('fr-FR', {
  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  timeZone: 'Europe/Paris',
})
const fmtJour = (iso) => new Date(iso).toLocaleDateString('fr-FR', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris',
})


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
    <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: 'var(--v1-sp-1) var(--v1-sp-4)', fontSize: '0.85rem' }}>
      {lignes.map(([k, v]) => (
        <div key={k} style={{ display: 'contents' }}>
          <dt className="text-muted">{k}</dt>
          <dd style={{ margin: 0 }}>{v}</dd>
        </div>
      ))}
    </dl>
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
  const retour = () => { setPlayerId(null); setMode(null); setConfirmation(''); navigate('/parier') }

  if (!player) {
    return (
      <div className="page-fade-in">
        <PlayerSelector players={players} onCreatePlayer={addPlayer}
          onSelect={(p) => { setPlayerId(p.id); navigate(`/parier/${p.id}`, { replace: true }) }} />
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
    Math.min(24, Math.max(1, Math.ceil((new Date(pari.created_at).getTime() + FENETRE_MS - now) / 3600000)))

  const initialNouveau = periodeEnCours ? formDepuis(dernier, periodeEnCours, officialCandidatesR1) : VIDE
  const termine = () => { setMode(null); setConfirmation('Pari enregistré.') }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 700 }}>
        <header style={{ paddingTop: 'var(--v1-sp-10)', paddingBottom: 'var(--v1-sp-6)', borderBottom: '3px solid var(--v1-text-primary)', marginBottom: 'var(--v1-sp-6)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--v1-sp-3)' }}>
            <div>
              <div style={{
                fontFamily: 'var(--v1-font)', fontSize: '0.7rem', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--v1-red)', marginBottom: 'var(--v1-sp-2)',
              }}>
                {periodeEnCours ? `Période ${periodeEnCours.id} · ${periodeEnCours.label}` : 'Jeu fermé'}
              </div>
              <h2 style={{ fontStyle: 'italic', marginBottom: 'var(--v1-sp-1)' }}>Paris de {player.name}</h2>
              {periodeEnCours && (
                <p className="text-muted text-sm" style={{ margin: 0 }}>
                  Cette période se termine le {fmtJour(periodeEnCours.ends_at)}.
                </p>
              )}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={retour}>Changer</button>
          </div>
        </header>

        {confirmation && <div className="card mb-4" style={{ borderColor: 'var(--v1-success)' }}>{confirmation}</div>}

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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--v1-sp-4)' }}>
                {mesParis.map((pari, i) => (
                  <div key={pari.id} className="card">
                    <div className="flex items-center justify-between mb-4" style={{ gap: 'var(--v1-sp-3)', flexWrap: 'wrap' }}>
                      <div>
                        <strong>{fmtDate(pari.created_at)}</strong>
                        <span className="badge badge-session1" style={{ marginLeft: 'var(--v1-sp-3)' }}>
                          Période {pari.periode}{periodeDe(pari) ? ` · ${periodeDe(pari).label}` : ''}
                        </span>
                        {i === 0 && <span className="badge badge-done" style={{ marginLeft: 'var(--v1-sp-2)' }}>Dernier pari</span>}
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

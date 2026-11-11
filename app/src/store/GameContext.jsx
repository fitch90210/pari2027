import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const GameContext = createContext(null)

const SAVE_ERRORS = {
  bad_code: 'Code incorrect : reconnecte-toi.',
  no_code: 'Ce joueur n\'a pas encore de code. Demande-le à l\'admin.',
  locked: 'Trop d\'essais : réessaie dans 15 minutes.',
  wrong_session: 'La phase a changé : recharge la page.',
  frozen: 'Ces pronostics sont gelés.',
}

export function GameProvider({ children }) {
  const [session, setSession] = useState(1)
  const [players, setPlayers] = useState([])
  const [pronosticsMap, setPronosticsMap] = useState({}) // { [playerId]: { s1, s2, s3 } }
  const [results, setResults] = useState(null)
  // Candidats officiels saisis par l'admin
  // officialCandidatesR1 : liste des candidats du 1er tour (saisie avant S2)
  // officialFinalists    : les 2 finalistes (saisie avant S3)
  const [officialCandidatesR1, setOfficialCandidatesR1] = useState([])
  const [officialFinalists, setOfficialFinalists] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // ── Chargement initial ──────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [stateRes, playersRes, pronosticsRes] = await Promise.all([
        supabase.from('game_state').select('*').single(),
        supabase.from('players').select('*').order('created_at'),
        supabase.from('pronostics').select('*'),
      ])
      if (stateRes.error) throw stateRes.error
      if (playersRes.error) throw playersRes.error
      if (pronosticsRes.error) throw pronosticsRes.error

      setSession(stateRes.data.session)
      setResults(stateRes.data.results)
      setOfficialCandidatesR1(stateRes.data.official_candidates_r1 ?? [])
      // Les finalistes sont dérivés des scores R1, stockés dans results.finalists
      setOfficialFinalists(stateRes.data.results?.finalists ?? [])
      setPlayers(playersRes.data)

      // Construire la map { playerId: { s1, s2, s3 } }
      const map = {}
      pronosticsRes.data.forEach(row => {
        const key = `s${row.session}`
        if (!map[row.player_id]) map[row.player_id] = {}
        map[row.player_id][key] = {
          m1: row.m1 ?? [],
          m2: row.m2 ?? {},
          m3: row.m3 ?? [],
          m4: row.m4 ?? '',
          m5: row.m5 ?? null,
          lockedAt: row.locked_at,
        }
      })
      setPronosticsMap(map)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // ── Codes joueurs (mémorisés sur l'appareil) ───────────────
  const codeKey = (playerId) => `pari2027-code-${playerId}`
  const getPlayerCode = (playerId) => {
    try { return localStorage.getItem(codeKey(playerId)) } catch { return null }
  }
  const rememberPlayerCode = (playerId, code) => {
    try { localStorage.setItem(codeKey(playerId), code) } catch { /* stockage indisponible */ }
  }
  const forgetPlayerCode = (playerId) => {
    try { localStorage.removeItem(codeKey(playerId)) } catch { /* stockage indisponible */ }
  }

  // Retourne 'ok', 'bad_code', 'locked' ou 'no_code'
  const verifyPlayerCode = async (playerId, code) => {
    const { data, error } = await supabase.rpc('verify_player_code', { p_player_id: playerId, p_code: code })
    if (error) throw error
    if (data === 'ok') rememberPlayerCode(playerId, code)
    return data
  }

  // ── Joueurs ─────────────────────────────────────────────────
  const addPlayer = async (name, code) => {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Nom vide')
    const { data, error } = await supabase.rpc('create_player', { p_name: trimmed, p_code: code })
    if (error) throw error
    rememberPlayerCode(data.id, code)
    setPlayers(prev => [...prev, data])
    return data
  }

  // ── Pronostics ──────────────────────────────────────────────
  const upsertPronostic = async (playerId, sessionNum, patch) => {
    const current = pronosticsMap[playerId]?.[`s${sessionNum}`] ?? {
      m1: [], m2: {}, m3: [], m4: '', m5: null, lockedAt: null
    }
    const updated = { ...current, ...patch }

    const { data, error } = await supabase.rpc('save_pronostic', {
      p_player_id: playerId,
      p_code: getPlayerCode(playerId),
      p_session: sessionNum,
      p_m1: updated.m1,
      p_m2: updated.m2,
      p_m3: updated.m3,
      p_m4: updated.m4,
      p_m5: updated.m5,
    })
    if (error) throw error
    if (data !== 'ok') {
      if (data === 'bad_code' || data === 'no_code') forgetPlayerCode(playerId)
      const err = new Error(SAVE_ERRORS[data] ?? 'Erreur de sauvegarde')
      err.code = data
      throw err
    }

    setPronosticsMap(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [`s${sessionNum}`]: updated,
      }
    }))
  }

  // ── Admin (mot de passe vérifié côté serveur) ───────────────
  const [adminPin, setAdminPin] = useState(null)

  const adminLogin = async (pin) => {
    const { data, error } = await supabase.rpc('admin_login', { p_pin: pin })
    if (error) throw error
    if (data) setAdminPin(pin)
    return data
  }

  const adminRpc = async (fn, args) => {
    const { data, error } = await supabase.rpc(fn, { p_pin: adminPin, ...args })
    if (error) throw error
    return data
  }

  const saveOfficialCandidatesR1 = async (candidates) => {
    await adminRpc('admin_save_official_candidates', { p_candidates: candidates })
    setOfficialCandidatesR1(candidates)
  }

  const changeSession = async (newSession) => {
    await adminRpc('admin_set_session', { p_session: newSession })
    setSession(newSession)
    await loadAll()
  }

  const saveResults = async (resultsData) => {
    await adminRpc('admin_save_results', { p_results: resultsData })
    setResults(resultsData)
    setOfficialFinalists(resultsData?.finalists ?? [])
  }

  // Retourne { player, code } : le code généré est à transmettre au joueur
  const adminCreatePlayer = async (name) => {
    const res = await adminRpc('admin_create_player', { p_name: name.trim() })
    setPlayers(prev => [...prev, res.player])
    return res
  }

  const adminResetPlayerCode = (playerId) =>
    adminRpc('admin_reset_player_code', { p_player_id: playerId })

  const removePlayer = async (playerId) => {
    await adminRpc('admin_remove_player', { p_player_id: playerId })
    setPlayers(prev => prev.filter(p => p.id !== playerId))
    setPronosticsMap(prev => {
      const next = { ...prev }
      delete next[playerId]
      return next
    })
  }

  return (
    <GameContext.Provider value={{
      session, players, pronosticsMap, results,
      officialCandidatesR1, officialFinalists,
      loading, error,
      addPlayer, upsertPronostic,
      getPlayerCode, verifyPlayerCode, forgetPlayerCode,
      isAdmin: adminPin != null, adminLogin,
      saveOfficialCandidatesR1, changeSession, saveResults,
      adminCreatePlayer, adminResetPlayerCode, removePlayer,
      reload: loadAll,
    }}>
      {children}
    </GameContext.Provider>
  )
}

export const useGame = () => {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used inside GameProvider')
  return ctx
}

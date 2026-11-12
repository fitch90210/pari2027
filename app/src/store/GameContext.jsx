import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { periodeCourante } from '../lib/periodes'

const GameContext = createContext(null)

const SAVE_ERRORS = {
  bad_code: 'Code incorrect : reconnecte-toi.',
  no_code: 'Ce joueur n\'a pas encore de code. Demande-le à l\'admin.',
  locked: 'Trop d\'essais : réessaie dans 15 minutes.',
  closed: 'Le jeu est fermé : plus aucun pari n\'est possible.',
  not_found: 'Pari introuvable.',
  expired: 'Ce pari n\'est plus modifiable (plus de 24 h).',
  period_closed: 'La période de ce pari est terminée : pose un nouveau pari.',
}

export function GameProvider({ children }) {
  const [players, setPlayers] = useState([])
  const [results, setResults] = useState(null)
  // Les paris datés et les périodes (bornes saisies par l'admin)
  const [periodes, setPeriodes] = useState([])
  const [paris, setParis] = useState([])
  // Horloge du navigateur, pour l'affichage seulement (le serveur décide)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(t)
  }, [])
  const periodeEnCours = useMemo(() => periodeCourante(periodes, new Date(now)), [periodes, now])
  // Candidats officiels saisis par l'admin
  // officialCandidatesR1 : liste des candidats du 1er tour (saisie avant la période 3)
  // officialFinalists    : les 2 finalistes (dérivés des scores du 1er tour)
  const [officialCandidatesR1, setOfficialCandidatesR1] = useState([])
  const [officialFinalists, setOfficialFinalists] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // ── Chargement initial ──────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [stateRes, playersRes, periodesRes, parisRes] = await Promise.all([
        supabase.from('game_state').select('*').single(),
        supabase.from('players').select('*').order('created_at'),
        supabase.from('periodes').select('*').order('id'),
        supabase.from('paris').select('*').order('created_at'),
      ])
      if (stateRes.error) throw stateRes.error
      if (playersRes.error) throw playersRes.error
      if (periodesRes.error) throw periodesRes.error
      if (parisRes.error) throw parisRes.error

      setResults(stateRes.data.results)
      setOfficialCandidatesR1(stateRes.data.official_candidates_r1 ?? [])
      // Les finalistes sont dérivés des scores R1, stockés dans results.finalists
      setOfficialFinalists(stateRes.data.results?.finalists ?? [])
      setPlayers(playersRes.data)
      setPeriodes(periodesRes.data)
      setParis(parisRes.data)

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

  // ── Paris ───────────────────────────────────────────────────
  const reloadParis = async () => {
    const { data, error } = await supabase.from('paris').select('*').order('created_at')
    if (error) throw error
    setParis(data)
    setNow(Date.now())
  }

  const checkPariStatus = (playerId, status) => {
    if (status === 'ok') return
    if (status === 'bad_code' || status === 'no_code') forgetPlayerCode(playerId)
    const err = new Error(SAVE_ERRORS[status] ?? 'Erreur de sauvegarde')
    err.code = status
    throw err
  }

  // values : { m1, m2, m3, m4, m5 }. La période est décidée par le serveur.
  const createPari = async (playerId, values) => {
    const { data, error } = await supabase.rpc('create_pari', {
      p_player_id: playerId, p_code: getPlayerCode(playerId),
      p_m1: values.m1, p_m2: values.m2, p_m3: values.m3, p_m4: values.m4, p_m5: values.m5,
    })
    if (error) throw error
    checkPariStatus(playerId, data)
    await reloadParis()
  }

  const updatePari = async (pariId, playerId, values) => {
    const { data, error } = await supabase.rpc('update_pari', {
      p_pari_id: pariId, p_player_id: playerId, p_code: getPlayerCode(playerId),
      p_m1: values.m1, p_m2: values.m2, p_m3: values.m3, p_m4: values.m4, p_m5: values.m5,
    })
    if (error) throw error
    checkPariStatus(playerId, data)
    await reloadParis()
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

  // periodes : [{ id, label, ends_at }] ×4, dates de fin croissantes
  const savePeriodes = async (liste) => {
    await adminRpc('admin_save_periodes', { p_periodes: liste })
    const { data, error } = await supabase.from('periodes').select('*').order('id')
    if (error) throw error
    setPeriodes(data)
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
    setParis(prev => prev.filter(p => p.player_id !== playerId))
  }

  return (
    <GameContext.Provider value={{
      players, results,
      periodes, paris, periodeEnCours, now, createPari, updatePari,
      officialCandidatesR1, officialFinalists,
      loading, error,
      addPlayer,
      getPlayerCode, verifyPlayerCode, forgetPlayerCode,
      isAdmin: adminPin != null, adminLogin,
      saveOfficialCandidatesR1, savePeriodes, saveResults,
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

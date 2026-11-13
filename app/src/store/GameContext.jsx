import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const GameContext = createContext(null)

const CLE_PSEUDO = 'pari2027-pseudo'

// Colonnes lues : les pronostics n'ont plus ni joueur ni période (pivot du 13/11).
const COLONNES = 'id, pseudo, m1, m2, m3, m4, m5, created_at'

export function GameProvider({ children }) {
  const [paris, setParis] = useState([])
  const [results, setResults] = useState(null)
  // Liste officielle des candidats du 1er tour (saisie par l'admin, pour les résultats)
  const [officialCandidatesR1, setOfficialCandidatesR1] = useState([])
  // Horloge du navigateur, pour les « il y a 3 min »
  const [now, setNow] = useState(() => Date.now())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(t)
  }, [])

  // ── Chargement ──────────────────────────────────────────────
  const lireParis = async () => {
    const { data, error } = await supabase.from('paris').select(COLONNES).order('created_at', { ascending: false })
    if (error) throw error
    setParis(data)
    setNow(Date.now())
  }

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [stateRes] = await Promise.all([
        supabase.from('game_state').select('results, official_candidates_r1').single(),
        lireParis(),
      ])
      if (stateRes.error) throw stateRes.error
      setResults(stateRes.data.results)
      setOfficialCandidatesR1(stateRes.data.official_candidates_r1 ?? [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // ── Pseudo (mémorisé sur l'appareil, simple confort) ────────
  const pseudoMemorise = () => {
    try { return localStorage.getItem(CLE_PSEUDO) ?? '' } catch { return '' }
  }
  const memoriserPseudo = pseudo => {
    try { localStorage.setItem(CLE_PSEUDO, pseudo) } catch { /* stockage indisponible */ }
  }

  // ── Pronostics ──────────────────────────────────────────────
  // valeurs : { m2, m3, m4, m5 } (voir lib/parcours.js). Renvoie l'id du pronostic.
  const createPronostic = async (pseudo, valeurs) => {
    const { data, error } = await supabase.rpc('create_pronostic', {
      p_pseudo: pseudo.trim(), p_m2: valeurs.m2, p_m3: valeurs.m3, p_m4: valeurs.m4, p_m5: valeurs.m5,
    })
    if (error) throw new Error(error.message)
    memoriserPseudo(pseudo.trim())
    await lireParis()
    return data
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
    if (error) throw new Error(error.message)
    return data
  }

  const saveOfficialCandidatesR1 = async (candidates) => {
    await adminRpc('admin_save_official_candidates', { p_candidates: candidates })
    setOfficialCandidatesR1(candidates)
  }

  const saveResults = async (resultsData) => {
    await adminRpc('admin_save_results', { p_results: resultsData })
    setResults(resultsData)
  }

  // Masquer / réafficher un pronostic (il reste en base)
  const setMasque = async (id, masque) => {
    await adminRpc('admin_set_masque', { p_id: id, p_masque: masque })
    await lireParis()
  }

  const listerMasques = () => adminRpc('admin_paris_masques', {})

  return (
    <GameContext.Provider value={{
      paris, results, officialCandidatesR1, now,
      loading, error, reload: loadAll,
      pseudoMemorise, createPronostic,
      isAdmin: adminPin != null, adminLogin,
      saveOfficialCandidatesR1, saveResults, setMasque, listerMasques,
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

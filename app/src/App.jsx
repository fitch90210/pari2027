import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { GameProvider } from './store/GameContext'
import { useGame } from './store/GameContext'
import Nav from './components/Nav'
import Home from './pages/Home'
import Pronostics from './pages/Pronostics'
import Classements from './pages/Classements'
import Admin from './pages/Admin'
import Voir from './pages/Voir'

function AppInner() {
  const { loading, error } = useGame()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <span>Chargement…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="loading-screen flex-col items-center gap-4">
        <div className="error-banner">Erreur de connexion : {error}</div>
        <p className="text-muted text-sm">Vérifie les variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env</p>
      </div>
    )
  }

  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/pronostics" element={<Pronostics />} />
        <Route path="/pronostics/:playerId" element={<Pronostics />} />
        <Route path="/classements" element={<Classements />} />
        <Route path="/voir" element={<Voir />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <GameProvider>
        <AppInner />
      </GameProvider>
    </BrowserRouter>
  )
}

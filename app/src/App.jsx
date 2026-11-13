import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { GameProvider, useGame } from './store/GameContext'
import Coque from './layout/Coque'
import Ecran from './ui/Ecran'
import Carte from './ui/Carte'
import EtatVide from './ui/EtatVide'
import Accueil from './pages/Accueil'
import Pronostics from './pages/pronostics/Pronostics'
import Pronostic from './pages/pronostics/Pronostic'
import Pronostiquer from './pages/pronostiquer/Pronostiquer'
import Admin from './pages/admin/Admin'
import Nuancier from './pages/Nuancier'
import Introuvable from './pages/Introuvable'

function AppInner() {
  const { loading, error } = useGame()

  if (loading) {
    return <Ecran><EtatVide titre="Chargement…" /></Ecran>
  }

  if (error) {
    return (
      <Ecran titre="Oups">
        <Carte>
          <EtatVide titre="Connexion impossible" texte={`Le serveur ne répond pas (${error}). Réessaie dans un instant.`} />
        </Carte>
      </Ecran>
    )
  }

  return (
    <Coque>
      <Routes>
        <Route path="/" element={<Accueil />} />
        <Route path="/pronostics" element={<Pronostics />} />
        <Route path="/pronostics/:id" element={<Pronostic />} />
        <Route path="/pronostiquer" element={<Pronostiquer />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/ui" element={<Nuancier />} />

        {/* Anciennes adresses, encore partagées dans le groupe */}
        <Route path="/paris" element={<Navigate to="/pronostics" replace />} />
        <Route path="/voir" element={<Navigate to="/pronostics" replace />} />
        <Route path="/joueurs/:ancien" element={<Navigate to="/pronostics" replace />} />
        <Route path="/classements" element={<Navigate to="/pronostics" replace />} />
        <Route path="/parier" element={<Navigate to="/pronostiquer" replace />} />
        <Route path="/parier/:ancien" element={<Navigate to="/pronostiquer" replace />} />
        <Route path="/regles" element={<Navigate to="/" replace />} />
        <Route path="/demo" element={<Navigate to="/" replace />} />

        <Route path="*" element={<Introuvable />} />
      </Routes>
    </Coque>
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

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { GameProvider, useGame } from './store/GameContext'
import Coque from './layout/Coque'
import Ecran from './ui/Ecran'
import Carte from './ui/Carte'
import EtatVide from './ui/EtatVide'
import Accueil from './pages/Accueil'
import Regles from './pages/Regles'
import Parier from './pages/parier/Parier'
import Classement from './pages/Classement'
import Admin from './pages/Admin'
import Paris from './pages/paris/Paris'
import Profil from './pages/Profil'
import Demo from './pages/Demo'
import Nuancier from './pages/Nuancier'
import { Introuvable, VersProfil } from './pages/Provisoire'

// Routes de la refonte UI. Pendant la transition, plusieurs routes affichent encore
// les anciennes pages ; chaque lot les remplace (C : accueil et règles, D : parier,
// E : paris, profils et classements, F : démo, G : admin).
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
        <Route path="/paris" element={<Paris />} />
        <Route path="/parier" element={<Parier />} />
        <Route path="/parier/:pariId" element={<Parier />} />
        <Route path="/classements" element={<Classement />} />
        <Route path="/regles" element={<Regles />} />
        <Route path="/joueurs/:id" element={<Profil />} />
        <Route path="/demo" element={<Demo />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/ui" element={<Nuancier />} />

        {/* Anciennes adresses, encore partagées dans le groupe */}
        <Route path="/pronostics" element={<Navigate to="/paris" replace />} />
        <Route path="/pronostics/:playerId" element={<VersProfil />} />
        <Route path="/voir" element={<Navigate to="/paris" replace />} />

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

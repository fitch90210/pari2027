import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { GameProvider, useGame } from './store/GameContext'
import Coque from './layout/Coque'
import Ecran from './ui/Ecran'
import Carte from './ui/Carte'
import EtatVide from './ui/EtatVide'
import Home from './pages/Home'
import Pronostics from './pages/Pronostics'
import Classements from './pages/Classements'
import Admin from './pages/Admin'
import Voir from './pages/Voir'
import Demo from './pages/Demo'
import Nuancier from './pages/Nuancier'
import { ProfilBientot, Introuvable, VersProfil } from './pages/Provisoire'

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
        <Route path="/" element={<Home />} />
        <Route path="/paris" element={<Voir />} />
        <Route path="/parier" element={<Pronostics />} />
        {/* Provisoire (ancien parcours avec choix du joueur) : remplacé au lot D */}
        <Route path="/parier/:playerId" element={<Pronostics />} />
        <Route path="/classements" element={<Classements />} />
        <Route path="/regles" element={<Home />} />
        <Route path="/joueurs/:id" element={<ProfilBientot />} />
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

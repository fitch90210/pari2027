import { useParams, Navigate } from 'react-router-dom'
import Ecran from '../ui/Ecran'
import Carte from '../ui/Carte'
import Bouton from '../ui/Bouton'
import EtatVide from '../ui/EtatVide'

// Écrans d'attente pendant la refonte, et redirections des anciennes adresses.

export function Introuvable() {
  return (
    <Ecran titre="Page introuvable">
      <Carte>
        <EtatVide titre="Cette page n'existe pas" texte="Le lien est peut-être ancien." action={<Bouton to="/">Revenir à l'accueil</Bouton>} />
      </Carte>
    </Ecran>
  )
}

// /pronostics/:id (ancienne page « Mes paris » d'un joueur) → profil du joueur
export function VersProfil() {
  const { playerId } = useParams()
  return <Navigate to={`/joueurs/${playerId}`} replace />
}

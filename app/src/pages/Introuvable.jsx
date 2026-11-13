import Ecran from '../ui/Ecran'
import Carte from '../ui/Carte'
import Bouton from '../ui/Bouton'
import EtatVide from '../ui/EtatVide'

export default function Introuvable() {
  return (
    <Ecran titre="Page introuvable">
      <Carte>
        <EtatVide titre="Cette page n'existe pas" texte="Le lien est peut-être ancien." action={<Bouton to="/">Revenir à l'accueil</Bouton>} />
      </Carte>
    </Ecran>
  )
}

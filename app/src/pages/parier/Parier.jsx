import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useGame } from '../../store/GameContext'
import Ecran from '../../ui/Ecran'
import Carte from '../../ui/Carte'
import Bouton from '../../ui/Bouton'
import EtatVide from '../../ui/EtatVide'
import Identification, { SaisieCode } from './Identification'
import Parcours from './Parcours'

// /parier : identification (seulement ici, le reste du site est anonyme), puis le parcours.
// /parier/:pariId : correction d'un pari de moins de 24 h.
export default function Parier() {
  const { pariId } = useParams()
  const { players, paris, addPlayer, getPlayerCode, verifyPlayerCode } = useGame()

  const pariEdit = pariId ? paris.find(p => String(p.id) === pariId) ?? null : null
  const [joueurId, setJoueurId] = useState(() => {
    if (pariEdit) return pariEdit.player_id
    // Un seul joueur reconnu sur cet appareil : on ne redemande pas qui c'est
    const connus = players.filter(p => getPlayerCode(p.id))
    return connus.length === 1 ? connus[0].id : null
  })
  const [debloque, setDebloque] = useState(false)
  const joueur = players.find(p => p.id === joueurId) ?? null

  if (pariId && !pariEdit) {
    return <Ecran titre="Pari introuvable"><Carte><EtatVide titre="Ce pari n'existe pas" action={<Bouton to="/parier">Nouveau pari</Bouton>} /></Carte></Ecran>
  }

  const changer = () => { setJoueurId(null); setDebloque(false) }

  if (!joueur) {
    return <Identification joueurs={players} getPlayerCode={getPlayerCode} onVerifier={verifyPlayerCode}
      onCreer={addPlayer} onChoisi={j => { setJoueurId(j.id); setDebloque(true) }} />
  }
  if (!debloque && !getPlayerCode(joueur.id)) {
    return <SaisieCode joueur={joueur} onVerifier={verifyPlayerCode} onDebloque={() => setDebloque(true)} onRetour={changer} />
  }
  return <Parcours key={joueur.id} joueur={joueur} pariEdit={pariEdit} onChangerJoueur={changer} />
}

import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useGame } from '../../store/GameContext'
import { depuis } from '../../lib/ui'
import Ecran from '../../ui/Ecran'
import Carte from '../../ui/Carte'
import Avatar from '../../ui/Avatar'
import Segmente from '../../ui/Segmente'
import Feuille from '../../ui/Feuille'
import EtatVide from '../../ui/EtatVide'
import { Liste, Ligne } from '../../ui/Liste'
import Tendances from './Tendances'
import DetailPari from './DetailPari'
import s from './Paris.module.css'

// « Paris » : deux lectures des paris du groupe. Tendances (agrégé par candidat) ou pari par pari (chaque pari, sans moyenne).
export default function Paris() {
  const { players, paris, now } = useGame()
  const pariPose = !!useLocation().state?.pariPose
  const [vue, setVue] = useState(pariPose ? 'paris' : 'tendances')
  const [tour, setTour] = useState(1)
  const [ouvert, setOuvert] = useState(null)

  const nomDe = id => players.find(p => p.id === id)?.name ?? 'Un joueur'
  const recents = [...paris].sort((a, b) => new Date(b.created_at) - new Date(a.created_at) || b.id - a.id)
  const maintenant = new Date(now)

  return (
    <Ecran titre="Paris">
      {pariPose && <p className={s.note}><strong>Ton pari est enregistré.</strong> Il est en tête de la liste « Pari par pari ».</p>}

      <Segmente label="Vue" valeur={vue} onChange={setVue}
        options={[{ valeur: 'tendances', libelle: 'Tendances' }, { valeur: 'paris', libelle: 'Pari par pari' }]} />

      {vue === 'tendances' && (
        <div className={s.pile}>
          <Segmente label="Tour" valeur={tour} onChange={setTour}
            options={[{ valeur: 1, libelle: '1er tour' }, { valeur: 2, libelle: '2nd tour' }]} />
          <Tendances tour={tour} />
        </div>
      )}

      {vue === 'paris' && (
        recents.length === 0
          ? <Carte><EtatVide titre="Aucun pari pour l'instant" texte="Les paris de la bande apparaîtront ici." /></Carte>
          : (
            <Carte liste>
              <Liste>
                {recents.map(p => (
                  <Ligne key={p.id} debut={<Avatar nom={nomDe(p.player_id)} taille={32} />} titre={nomDe(p.player_id)}
                    sousTitre={`P${p.periode} · ${p.m4 ? `Vainqueur : ${p.m4}` : 'Pari posé'}`}
                    fin={depuis(p.created_at, maintenant)} onClick={() => setOuvert(p)} />
                ))}
              </Liste>
            </Carte>
          )
      )}

      <Feuille ouverte={!!ouvert} onFermer={() => setOuvert(null)} titre="Pari">
        {ouvert && <DetailPari pari={ouvert} />}
      </Feuille>
    </Ecran>
  )
}

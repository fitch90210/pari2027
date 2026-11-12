import { useState } from 'react'
import Ecran from '../ui/Ecran'
import Carte from '../ui/Carte'
import Bouton from '../ui/Bouton'
import Avatar from '../ui/Avatar'
import Pastille from '../ui/Pastille'
import Segmente from '../ui/Segmente'
import Curseur from '../ui/Curseur'
import Etapes from '../ui/Etapes'
import Feuille from '../ui/Feuille'
import EtatVide from '../ui/EtatVide'
import { Liste, Ligne } from '../ui/Liste'
import s from './Nuancier.module.css'

// Page interne (/ui, non liée) : tous les composants de base, pour vérifier tokens et thèmes.
export default function Nuancier() {
  const [vue, setVue] = useState('tendances')
  const [pct, setPct] = useState(32)
  const [feuille, setFeuille] = useState(false)
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme ?? 'auto')

  const changerTheme = t => {
    setTheme(t)
    if (t === 'auto') delete document.documentElement.dataset.theme
    else document.documentElement.dataset.theme = t
  }

  return (
    <Ecran titre="Composants" surtitre="Lot B · fondations">
      <Segmente label="Thème" valeur={theme} onChange={changerTheme}
        options={[{ valeur: 'auto', libelle: 'Auto' }, { valeur: 'light', libelle: 'Clair' }, { valeur: 'dark', libelle: 'Sombre' }]} />

      <Carte surface>
        <div className={s.pile}>
          <Pastille>Période 2 · J-150</Pastille>
          <h2 className={s.titre}>Qui gagnera la présidentielle ?</h2>
          <p className={s.texte}>Cinq pronostics, un classement entre amis.</p>
          <div className={s.rangee}>
            <Bouton>Parier</Bouton>
            <Bouton variante="secondaire">Comment ça marche</Bouton>
            <Bouton variante="discret">Plus tard</Bouton>
          </div>
        </div>
      </Carte>

      <Carte>
        <div className={s.bonus}>
          <span className={s.chiffre}>+4</span>
          <span className={s.texte}>points d'avance si tu paries aujourd'hui</span>
          <Pastille accent>−1 le 11 déc.</Pastille>
        </div>
      </Carte>

      <Segmente label="Vue" valeur={vue} onChange={setVue}
        options={[{ valeur: 'tendances', libelle: 'Tendances' }, { valeur: 'pari', libelle: 'Pari par pari' }]} />

      <Carte>
        <div className={s.pile}>
          <Etapes courante={2} total={5} />
          <Curseur label="Jordan Bardella" valeur={pct} onChange={setPct} max={60} />
        </div>
      </Carte>

      <Carte liste>
        <Liste>
          {['Camille', 'Mehdi', 'Léa', 'Hugo'].map((n, i) => (
            <Ligne key={n} debut={<Avatar nom={n} />} titre={n} sousTitre="Vainqueur : Édouard Philippe"
              fin={['2 h', 'Hier', '3 nov.', '28 oct.'][i]} onClick={() => setFeuille(true)} />
          ))}
        </Liste>
      </Carte>

      <div className={s.rangee}>
        <Bouton pleineLargeur grand disabled>Continuer</Bouton>
      </div>

      <Carte>
        <EtatVide titre="Aucun pari pour l'instant" texte="Les paris de la bande apparaîtront ici." action={<Bouton variante="secondaire">Parier en premier</Bouton>} />
      </Carte>

      <Feuille ouverte={feuille} onFermer={() => setFeuille(false)} titre="Pari de Camille">
        <p className={s.texte}>Détail du pari (lot E).</p>
        <Bouton pleineLargeur onClick={() => setFeuille(false)}>Fermer</Bouton>
      </Feuille>
    </Ecran>
  )
}

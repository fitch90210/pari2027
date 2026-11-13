import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useGame } from '../store/GameContext'
import { depuis } from '../lib/ui'
import { pseudoDe, resumePronostic } from '../lib/pronostic'
import { tendancesSecondTour } from '../lib/tendances'
import Ecran from '../ui/Ecran'
import Carte from '../ui/Carte'
import Bouton from '../ui/Bouton'
import Avatar from '../ui/Avatar'
import Pied from '../ui/Pied'
import { Liste, Ligne } from '../ui/Liste'
import s from './Accueil.module.css'

const ETAPES = [
  { titre: 'Le 1er tour', texte: 'Choisis les candidats et donne à chacun son pourcentage.' },
  { titre: 'Le 2nd tour', texte: 'Tes deux premiers s\'affrontent : qui gagne, et avec quel score ?' },
  { titre: 'Un pseudo, c\'est tout', texte: 'Pas de compte. Ton pronostic rejoint ceux des autres, visibles par tous.' },
]

export default function Accueil() {
  const { paris, now } = useGame()
  const maintenant = useMemo(() => new Date(now), [now])
  const t2 = useMemo(() => tendancesSecondTour(paris), [paris])
  const favori = t2.vainqueurs[0]
  const derniers = paris.slice(0, 4)

  return (
    <Ecran>
      <div className={s.marque}>
        <span className={s.nom}><span className={s.point} aria-hidden="true" />Pari 2027</span>
      </div>

      <Carte surface className={s.banniere}>
        <span className={s.surtitre}>Présidentielle 2027</span>
        <h1 className={s.titre}>Qui sera élu en 2027 ?</h1>
        <p className={s.texte}>Donne ton pronostic pour les deux tours, et regarde ce que les autres pronostiquent.</p>
        <div className={s.actions}>
          <Bouton to="/pronostiquer">Pronostiquer</Bouton>
          <Bouton variante="secondaire" to="/pronostics">Les pronostics</Bouton>
        </div>
      </Carte>

      {paris.length > 0 && (
        <Carte className={s.chiffres}>
          <div className={s.chiffre}>
            <span className={s.grand}>{paris.length}</span>
            <span className={s.legende}>pronostic{paris.length > 1 ? 's' : ''}</span>
          </div>
          {favori && (
            <div className={s.chiffre}>
              <span className={s.favori}>{favori.nom}</span>
              <span className={s.legende}>
                donné vainqueur par {favori.personnes.length} personne{favori.personnes.length > 1 ? 's' : ''} sur {t2.personnes}
              </span>
            </div>
          )}
        </Carte>
      )}

      <section className={s.rubrique}>
        <div className={s.rubriqueEntete}><h2 className={s.rubriqueTitre}>Comment ça marche</h2></div>
        <Carte liste>
          <Liste>
            {ETAPES.map((e, i) => (
              <Ligne key={e.titre} debut={<span className={s.numero}>{i + 1}</span>} titre={e.titre} sousTitre={e.texte} multiligne />
            ))}
          </Liste>
        </Carte>
      </section>

      <section className={s.rubrique}>
        <div className={s.rubriqueEntete}>
          <h2 className={s.rubriqueTitre}>Derniers pronostics</h2>
          <Link to="/pronostics" className={s.lienDiscret}>Tout voir</Link>
        </div>
        <Carte liste>
          {derniers.length === 0
            ? <Liste><Ligne titre="Aucun pronostic pour l'instant" sousTitre="Sois le premier." /></Liste>
            : <Liste>
                {derniers.map(p => (
                  <Ligne
                    key={p.id}
                    to="/pronostics"
                    debut={<Avatar nom={pseudoDe(p)} taille={28} />}
                    titre={pseudoDe(p)}
                    sousTitre={resumePronostic(p)}
                    fin={depuis(p.created_at, maintenant)}
                  />
                ))}
              </Liste>}
        </Carte>
      </section>

      <Pied />
    </Ecran>
  )
}

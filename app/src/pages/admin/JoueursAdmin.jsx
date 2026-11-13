import { useState } from 'react'
import { useGame } from '../../store/GameContext'
import Carte from '../../ui/Carte'
import Bouton from '../../ui/Bouton'
import Champ from '../../ui/Champ'
import Avatar from '../../ui/Avatar'
import Feuille from '../../ui/Feuille'
import Retour from './Retour'
import s from './Admin.module.css'

// Joueurs : créer (le code est généré et affiché une seule fois), renouveler un code, supprimer.
// La suppression retire aussi tous les paris du joueur : elle exige de retaper son nom.
export default function JoueursAdmin() {
  const { players, adminCreatePlayer, adminResetPlayerCode, removePlayer } = useGame()
  const [nom, setNom] = useState('')
  const [creation, setCreation] = useState(false)
  const [erreur, setErreur] = useState('')
  const [code, setCode] = useState(null) // { nom, code } : à transmettre, jamais réaffiché
  const [action, setAction] = useState(null) // { type: 'code' | 'supprimer', joueur } : confirmation en cours
  const [saisie, setSaisie] = useState('')
  const [encours, setEncours] = useState(false)
  const [erreurAction, setErreurAction] = useState('')

  const ajouter = async e => {
    e.preventDefault()
    const n = nom.trim()
    if (!n) return
    setCreation(true); setErreur('')
    try {
      const { player, code: c } = await adminCreatePlayer(n)
      setCode({ nom: player.name, code: c })
      setNom('')
    } catch (err) {
      setErreur(err.message?.includes('unique') || err.code === '23505' ? 'Ce nom est déjà pris.' : err.message)
    } finally { setCreation(false) }
  }

  const fermer = () => { setAction(null); setSaisie(''); setErreurAction('') }

  const confirmer = async () => {
    setEncours(true); setErreurAction('')
    try {
      if (action.type === 'code') setCode({ nom: action.joueur.name, code: await adminResetPlayerCode(action.joueur.id) })
      else await removePlayer(action.joueur.id)
      fermer()
    } catch (err) { setErreurAction(err.message) }
    finally { setEncours(false) }
  }

  const suppression = action?.type === 'supprimer'
  const nomJuste = suppression && saisie.trim().toLowerCase() === action.joueur.name.trim().toLowerCase()

  return (
    <div className={s.pile}>
      {code && (
        <Carte>
          <div className={s.codeCarte} role="status">
            <span className={s.texte}>Code de <strong>{code.nom}</strong> : à lui transmettre, il ne sera plus affiché.</span>
            <span className={s.code}>{code.code}</span>
            <Bouton variante="secondaire" onClick={() => setCode(null)}>C'est noté</Bouton>
          </div>
        </Carte>
      )}

      <section className={s.pile}>
        <h2 className={s.titreSection}>{players.length} joueur{players.length > 1 ? 's' : ''}</h2>
        {players.length === 0 && <Carte><p className={s.texte}>Aucun joueur.</p></Carte>}
        {[...players].sort((a, b) => a.name.localeCompare(b.name, 'fr')).map(p => (
          <Carte key={p.id}>
            <div className={s.joueur}>
              <div className={s.joueurNom}>
                <Avatar nom={p.name} taille={32} />
                <span className={s.nomJoueur}>{p.name}</span>
              </div>
              <div className={s.joueurActions}>
                <Bouton variante="secondaire" onClick={() => setAction({ type: 'code', joueur: p })}>Nouveau code</Bouton>
                <Bouton variante="secondaire" className={s.supprimer} onClick={() => setAction({ type: 'supprimer', joueur: p })}>Supprimer</Bouton>
              </div>
            </div>
          </Carte>
        ))}
      </section>

      <Carte>
        <form className={s.rangee} onSubmit={ajouter}>
          <Champ label="Nouveau joueur" valeur={nom} onChange={setNom} maxLength={50} disabled={creation} />
          <Bouton type="submit" disabled={creation || !nom.trim()}>{creation ? '…' : 'Ajouter'}</Bouton>
        </form>
        <Retour erreur={erreur} />
      </Carte>

      <Feuille ouverte={action?.type === 'code' || suppression} onFermer={fermer}
        titre={suppression ? `Supprimer ${action.joueur.name} ?` : `Nouveau code pour ${action?.joueur?.name ?? ''}`}>
        <div className={s.formulaire}>
          {suppression
            ? <>
                <p className={s.texte}>Le joueur et <strong>tous ses paris</strong> seront supprimés. Cette action ne peut pas être annulée.</p>
                <Champ label={`Tape « ${action.joueur.name} » pour confirmer`} valeur={saisie} onChange={setSaisie} autoComplete="off" />
              </>
            : <p className={s.texte}>L'ancien code ne fonctionnera plus. Le nouveau s'affichera une seule fois.</p>}
          <Retour erreur={erreurAction} />
          <Bouton className={suppression ? s.danger : undefined} pleineLargeur onClick={confirmer}
            disabled={encours || (suppression && !nomJuste)}>
            {encours ? '…' : suppression ? 'Supprimer définitivement' : 'Générer le code'}
          </Bouton>
          <Bouton variante="discret" pleineLargeur onClick={fermer}>Annuler</Bouton>
        </div>
      </Feuille>
    </div>
  )
}

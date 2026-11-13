import { useState } from 'react'
import { useGame } from '../../store/GameContext'
import Ecran from '../../ui/Ecran'
import Carte from '../../ui/Carte'
import Bouton from '../../ui/Bouton'
import Champ from '../../ui/Champ'
import Segmente from '../../ui/Segmente'
import Calendrier from './Calendrier'
import Scrutin from './Scrutin'
import JoueursAdmin from './JoueursAdmin'
import s from './Admin.module.css'

function Connexion({ onLogin }) {
  const [mdp, setMdp] = useState('')
  const [erreur, setErreur] = useState('')
  const [verif, setVerif] = useState(false)

  const envoyer = async e => {
    e.preventDefault()
    setVerif(true); setErreur('')
    try {
      if (!(await onLogin(mdp))) { setErreur('Mot de passe incorrect.'); setMdp('') }
    } catch { setErreur('Erreur de connexion.') }
    finally { setVerif(false) }
  }

  return (
    <Ecran titre="Administration" surtitre="Accès restreint">
      <Carte>
        <form className={s.formulaire} onSubmit={envoyer}>
          <Champ label="Mot de passe admin" type="password" maxLength={64} autoComplete="current-password" autoFocus
            valeur={mdp} onChange={v => { setMdp(v); setErreur('') }} erreur={erreur} />
          <Bouton type="submit" pleineLargeur disabled={!mdp || verif}>{verif ? 'Vérification…' : 'Accéder'}</Bouton>
        </form>
      </Carte>
    </Ecran>
  )
}

// Admin : trois onglets, dans l'ordre où on s'en sert. Hors navigation (lien discret en pied d'accueil).
export default function Admin() {
  const { isAdmin, adminLogin, periodes, periodeEnCours, savePeriodes } = useGame()
  const [onglet, setOnglet] = useState('calendrier')

  if (!isAdmin) return <Connexion onLogin={adminLogin} />

  return (
    <Ecran titre="Administration">
      <Segmente label="Section" valeur={onglet} onChange={setOnglet}
        options={[{ valeur: 'calendrier', libelle: 'Calendrier' }, { valeur: 'scrutin', libelle: 'Scrutin' }, { valeur: 'joueurs', libelle: 'Joueurs' }]} />
      {onglet === 'calendrier' && (
        <Calendrier key={periodes.map(p => p.ends_at + p.label).join('|')} periodes={periodes} periodeEnCours={periodeEnCours} onSave={savePeriodes} />
      )}
      {onglet === 'scrutin' && <Scrutin />}
      {onglet === 'joueurs' && <JoueursAdmin />}
    </Ecran>
  )
}

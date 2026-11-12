import { useState } from 'react'
import Ecran from '../../ui/Ecran'
import Carte from '../../ui/Carte'
import Bouton from '../../ui/Bouton'
import Champ from '../../ui/Champ'
import Avatar from '../../ui/Avatar'
import { Liste, Ligne } from '../../ui/Liste'
import s from './Identification.module.css'

const MESSAGES = {
  bad_code: 'Code incorrect.',
  locked: 'Trop d\'essais : réessaie dans 15 minutes.',
  no_code: 'Ce joueur n\'a pas encore de code. Demande-le à l\'admin.',
}

// Saisie du code à 4 chiffres d'un joueur existant (sur un autre appareil, par exemple).
export function SaisieCode({ joueur, onVerifier, onDebloque, onRetour }) {
  const [code, setCode] = useState('')
  const [verif, setVerif] = useState(false)
  const [erreur, setErreur] = useState('')

  const envoyer = async e => {
    e.preventDefault()
    setVerif(true); setErreur('')
    try {
      const statut = await onVerifier(joueur.id, code)
      if (statut === 'ok') onDebloque()
      else { setErreur(MESSAGES[statut] ?? 'Erreur.'); setCode('') }
    } catch { setErreur('Erreur de connexion.') }
    finally { setVerif(false) }
  }

  return (
    <Ecran titre={joueur.name} surtitre="Saisis ton code">
      <Carte>
        <form className={s.formulaire} onSubmit={envoyer}>
          <Champ code label="Code à 4 chiffres" valeur={code} onChange={v => { setCode(v); setErreur('') }} erreur={erreur} autoFocus />
          <div className={s.actions}>
            <Bouton type="submit" pleineLargeur disabled={verif || code.length !== 4}>{verif ? 'Vérification…' : 'Continuer'}</Bouton>
            <Bouton variante="discret" pleineLargeur onClick={onRetour}>Changer de joueur</Bouton>
          </div>
        </form>
      </Carte>
      <p className={s.note}>Code oublié ? L'admin peut t'en générer un nouveau.</p>
    </Ecran>
  )
}

function NouveauJoueur({ onCreer, onRetour }) {
  const [nom, setNom] = useState('')
  const [code, setCode] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')

  const envoyer = async e => {
    e.preventDefault()
    if (!nom.trim()) return
    if (!/^[0-9]{4}$/.test(code)) { setErreur('Choisis un code de 4 chiffres.'); return }
    setEnvoi(true); setErreur('')
    try { await onCreer(nom, code) }
    catch (err) {
      setErreur(err.message?.includes('unique') || err.code === '23505' ? 'Ce nom est déjà pris.' : (err.message ?? 'Erreur.'))
      setEnvoi(false)
    }
  }

  return (
    <Ecran titre="Bienvenue" surtitre="Nouveau joueur">
      <Carte>
        <form className={s.formulaire} onSubmit={envoyer}>
          <Champ label="Ton prénom ou pseudo" valeur={nom} onChange={setNom} maxLength={40} autoComplete="given-name" autoFocus />
          <Champ code label="Choisis un code à 4 chiffres" valeur={code} onChange={v => { setCode(v); setErreur('') }}
            aide="Il protège tes paris : garde-le, il te sera demandé sur un autre appareil." />
          {erreur && <p className={s.erreur} role="alert">{erreur}</p>}
          <div className={s.actions}>
            <Bouton type="submit" pleineLargeur disabled={envoi || !nom.trim() || code.length !== 4}>{envoi ? 'Création…' : 'Continuer'}</Bouton>
            <Bouton variante="discret" pleineLargeur onClick={onRetour}>Retour</Bouton>
          </div>
        </form>
      </Carte>
    </Ecran>
  )
}

// « Qui es-tu ? » : choix du joueur (les joueurs reconnus sur cet appareil d'abord) ou création.
export default function Identification({ joueurs, getPlayerCode, onChoisi, onCreer, onVerifier }) {
  const [vue, setVue] = useState('liste') // 'liste' | 'nouveau' | joueur (saisie du code)

  if (vue === 'nouveau') return <NouveauJoueur onCreer={async (n, c) => onChoisi(await onCreer(n, c))} onRetour={() => setVue('liste')} />
  if (vue !== 'liste') {
    return <SaisieCode joueur={vue} onVerifier={onVerifier} onDebloque={() => onChoisi(vue)} onRetour={() => setVue('liste')} />
  }

  const connu = j => !!getPlayerCode(j.id)
  const tries = [...joueurs].sort((a, b) => Number(connu(b)) - Number(connu(a)) || a.name.localeCompare(b.name, 'fr'))

  return (
    <Ecran titre="Qui es-tu ?" surtitre="Pour parier">
      <div className={s.pile}>
        {tries.length > 0 && (
          <Carte liste>
            <Liste>
              {tries.map(j => (
                <Ligne key={j.id} debut={<Avatar nom={j.name} taille={32} />} titre={j.name}
                  sousTitre={connu(j) ? 'Reconnu sur cet appareil' : undefined}
                  onClick={() => (connu(j) ? onChoisi(j) : setVue(j))} />
              ))}
            </Liste>
          </Carte>
        )}
        <Bouton variante="secondaire" pleineLargeur onClick={() => setVue('nouveau')}>Je suis nouveau</Bouton>
      </div>
    </Ecran>
  )
}

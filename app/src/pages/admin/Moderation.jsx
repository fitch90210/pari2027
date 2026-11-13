import { useEffect, useState } from 'react'
import { useGame } from '../../store/GameContext'
import { depuis } from '../../lib/ui'
import { pseudoDe, resumePronostic } from '../../lib/pronostic'
import Carte from '../../ui/Carte'
import Bouton from '../../ui/Bouton'
import EtatVide from '../../ui/EtatVide'
import Retour from './Retour'
import s from './Admin.module.css'

function Ligne({ pari, maintenant, action, envoi, onAction }) {
  return (
    <li className={s.modere}>
      <span className={s.modereTextes}>
        <span className={s.modereNom}>{pseudoDe(pari)} <span className={s.modereDate}>· {depuis(pari.created_at, maintenant)}</span></span>
        <span className={s.modereResume}>{resumePronostic(pari)}</span>
      </span>
      <Bouton variante="secondaire" onClick={onAction} disabled={envoi}>{action}</Bouton>
    </li>
  )
}

// Modération : masquer un pronostic abusif (il reste en base et peut être réaffiché).
export default function Moderation() {
  const { paris, now, setMasque, listerMasques } = useGame()
  const [masques, setMasques] = useState(null)
  const [envoi, setEnvoi] = useState(null)
  const [erreur, setErreur] = useState('')
  const maintenant = new Date(now)

  useEffect(() => {
    let actif = true
    listerMasques().then(l => { if (actif) setMasques(l) }).catch(e => { if (actif) setErreur(e.message) })
    return () => { actif = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const basculer = async (pari, masque) => {
    setEnvoi(pari.id); setErreur('')
    try {
      await setMasque(pari.id, masque)
      setMasques(await listerMasques())
    } catch (e) { setErreur(e.message) } finally { setEnvoi(null) }
  }

  return (
    <div className={s.pile}>
      <p className={s.texte}>Un pronostic masqué disparaît du site mais reste en base : tu peux le réafficher.</p>
      <Retour erreur={erreur} />

      {masques?.length > 0 && (
        <section className={s.pile}>
          <h2 className={s.titreSection}>Masqués ({masques.length})</h2>
          <Carte liste>
            <ul className={s.listeModeree}>
              {masques.map(p => <Ligne key={p.id} pari={p} maintenant={maintenant} action="Réafficher" envoi={envoi === p.id} onAction={() => basculer(p, false)} />)}
            </ul>
          </Carte>
        </section>
      )}

      <section className={s.pile}>
        <h2 className={s.titreSection}>Visibles ({paris.length})</h2>
        {paris.length === 0
          ? <Carte><EtatVide titre="Aucun pronostic" /></Carte>
          : (
            <Carte liste>
              <ul className={s.listeModeree}>
                {paris.map(p => <Ligne key={p.id} pari={p} maintenant={maintenant} action="Masquer" envoi={envoi === p.id} onAction={() => basculer(p, true)} />)}
              </ul>
            </Carte>
          )}
      </section>
    </div>
  )
}

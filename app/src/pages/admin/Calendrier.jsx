import { useState } from 'react'
import { isoVersParis, parisVersIso } from '../../lib/periodes'
import Carte from '../../ui/Carte'
import Bouton from '../../ui/Bouton'
import Champ from '../../ui/Champ'
import Pastille from '../../ui/Pastille'
import Retour from './Retour'
import s from './Admin.module.css'

// Bornes des périodes, saisies en heure de Paris.
export default function Calendrier({ periodes, periodeEnCours, onSave }) {
  const [lignes, setLignes] = useState(() => periodes.map(p => ({ id: p.id, label: p.label, fin: isoVersParis(p.ends_at) })))
  const [envoi, setEnvoi] = useState(false)
  const [ok, setOk] = useState(false)
  const [erreur, setErreur] = useState('')

  const maj = (id, patch) => { setOk(false); setLignes(ls => ls.map(l => l.id === id ? { ...l, ...patch } : l)) }

  const enregistrer = async e => {
    e.preventDefault()
    if (lignes.some(l => !l.fin)) { setErreur('Toutes les dates de fin sont obligatoires.'); return }
    setEnvoi(true); setErreur('')
    try {
      await onSave(lignes.map(l => ({ id: l.id, label: l.label, ends_at: parisVersIso(l.fin) })))
      setOk(true)
    } catch (err) { setErreur(err.message) }
    finally { setEnvoi(false) }
  }

  return (
    <div className={s.pile}>
      <p className={s.texte}>
        Chaque période commence à la fin de la précédente ; le jeu ferme à la fin de la période 4. Dates en heure de Paris.
        Les paris déjà posés gardent leur période si tu déplaces une borne. Le bonus d'anticipation se compte jusqu'à la fin de la période 3.
        Période en cours : <strong>{periodeEnCours ? `${periodeEnCours.id}. ${periodeEnCours.label}` : 'aucune (jeu fermé)'}</strong>.
      </p>
      <form className={s.pile} onSubmit={enregistrer}>
        {lignes.map(l => (
          <Carte key={l.id}>
            <div className={s.formulaire}>
              <div className={s.etapeEntete}>
                <h2 className={s.etapeTitre}>Période {l.id}</h2>
                {l.id === periodeEnCours?.id && <Pastille accent>En cours</Pastille>}
              </div>
              <Champ label="Nom" valeur={l.label} onChange={v => maj(l.id, { label: v })} maxLength={60} />
              <Champ label="Fin le (heure de Paris)" type="datetime-local" valeur={l.fin} onChange={v => maj(l.id, { fin: v })} />
            </div>
          </Carte>
        ))}
        <Retour ok={ok} erreur={erreur} />
        <Bouton type="submit" grand pleineLargeur disabled={envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer les périodes'}</Bouton>
      </form>
    </div>
  )
}

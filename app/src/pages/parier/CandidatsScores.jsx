import { useState } from 'react'
import Champ from '../../ui/Champ'
import Bouton from '../../ui/Bouton'
import Curseur from '../../ui/Curseur'
import Icone from '../../ui/Icone'
import { nombre, pourcent, repartirEgalement } from '../../lib/parcours'
import s from './CandidatsScores.module.css'

const norme = t => String(t ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const MAX_PROPOSES = 8

// Candidats du 1er tour ET leur score, en une seule étape : on ajoute un candidat, puis on règle son pourcentage
// sur la ligne qui vient d'apparaître. Retirer un candidat retire aussi son score.
// valeur : { m1: [noms], m2: { nom: 'texte' } } ; onChange reçoit le même format.
export default function CandidatsScores({ options, valeur, onChange }) {
  const [requete, setRequete] = useState('')
  const choisis = valeur.m1
  const dejaChoisi = nom => choisis.some(c => norme(c) === norme(nom))

  const ajouter = nom => {
    const n = nom.trim()
    if (!n || dejaChoisi(n)) return
    onChange({ m1: [...choisis, n], m2: valeur.m2 })
    setRequete('')
  }
  const retirer = nom => {
    const m2 = { ...valeur.m2 }
    delete m2[nom]
    onChange({ m1: choisis.filter(c => c !== nom), m2 })
  }
  const regler = (nom, v) => {
    const m2 = { ...valeur.m2 }
    if (v === 0) delete m2[nom]; else m2[nom] = String(v)
    onChange({ m1: choisis, m2 })
  }

  const q = norme(requete)
  const proposes = options.filter(o => !dejaChoisi(o) && (!q || norme(o).includes(q))).slice(0, q ? 20 : MAX_PROPOSES)
  const nomLibre = requete.trim()
  const peutAjouter = nomLibre.length > 1 && !dejaChoisi(nomLibre) && !options.some(o => norme(o) === norme(nomLibre))

  return (
    <div className={s.pile}>
      <Champ valeur={requete} onChange={setRequete} type="search" autoComplete="off"
        placeholder="Chercher un candidat à ajouter" aria-label="Chercher un candidat à ajouter" />

      {(proposes.length > 0 || peutAjouter) && (
        <div className={s.suggestions} role="group" aria-label="Candidats proposés">
          {proposes.map(nom => (
            <button key={nom} type="button" className={s.option} onClick={() => ajouter(nom)}>
              {nom}<span className={s.ajout}>Ajouter</span>
            </button>
          ))}
          {peutAjouter && (
            <button type="button" className={`${s.option} ${s.libre}`} onClick={() => ajouter(nomLibre)}>
              Ajouter « {nomLibre} »<Icone nom="plus" taille={16} epaisseur={2.2} />
            </button>
          )}
        </div>
      )}

      <div className={s.entete}>
        <h2 className={s.titreListe}>Tes candidats ({choisis.length})</h2>
      </div>
      {choisis.length === 0
        ? <p className={s.vide}>Ajoute un candidat ci-dessus : il apparaît ici avec son curseur.</p>
        : (
          <div className={s.lignes}>
            {[...choisis].reverse().map(nom => (
              <div key={nom} className={s.ligne}>
                <div className={s.curseur}>
                  <Curseur label={nom} max={60} pas={0.5} valeur={nombre(valeur.m2[nom])} format={pourcent} onChange={v => regler(nom, v)} />
                </div>
                <button type="button" className={s.retirer} onClick={() => retirer(nom)} aria-label={`Retirer ${nom}`}>
                  <Icone nom="fermer" taille={18} epaisseur={2} />
                </button>
              </div>
            ))}
          </div>
        )}
      {choisis.length >= 2 && (
        <Bouton variante="secondaire" className={s.egal} onClick={() => onChange({ m1: choisis, m2: repartirEgalement(choisis) })}>Répartir à égalité</Bouton>
      )}
    </div>
  )
}

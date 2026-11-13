import { useMemo, useState } from 'react'
import Champ from '../../ui/Champ'
import Bouton from '../../ui/Bouton'
import Curseur from '../../ui/Curseur'
import Icone from '../../ui/Icone'
import Visage from '../../ui/Visage'
import { nombre, pourcent, repartirEgalement, trierParPopularite } from '../../lib/parcours'
import s from './CandidatsScores.module.css'

const norme = t => String(t ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// Candidats du 1er tour ET leur score, en une seule étape : on ajoute un candidat, puis on règle son pourcentage
// sur la ligne qui vient d'apparaître. Retirer un candidat retire aussi son score.
// Suggestions : tous les candidats, les plus cités dans les pronostics d'abord, dans une zone qui défile.
// valeur : { m1: [noms], m2: { nom: 'texte' } } ; onChange reçoit le même format.
export default function CandidatsScores({ options, paris = [], valeur, onChange }) {
  const [requete, setRequete] = useState('')
  const choisis = valeur.m1
  const dejaChoisi = nom => choisis.some(c => norme(c) === norme(nom))
  const tries = useMemo(() => trierParPopularite(options, paris), [options, paris])

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
  const proposes = tries.filter(o => !dejaChoisi(o.nom) && (!q || norme(o.nom).includes(q)))
  const nomLibre = requete.trim()
  const peutAjouter = nomLibre.length > 1 && !dejaChoisi(nomLibre) && !options.some(o => norme(o) === norme(nomLibre))

  return (
    <div className={s.pile}>
      <Champ valeur={requete} onChange={setRequete} type="search" autoComplete="off"
        placeholder="Chercher un candidat à ajouter" aria-label="Chercher un candidat à ajouter" />

      {(proposes.length > 0 || peutAjouter) && (
        <div className={s.suggestions} role="group" aria-label={q ? 'Candidats trouvés' : 'Candidats, les plus cités d\'abord'}>
          {peutAjouter && (
            <button type="button" className={`${s.option} ${s.libre}`} onClick={() => ajouter(nomLibre)}>
              <span className={s.optionNom}><Visage nom={nomLibre} taille={28} />Ajouter « {nomLibre} »</span>
              <Icone nom="plus" taille={16} epaisseur={2.2} />
            </button>
          )}
          {proposes.map(o => (
            <button key={o.nom} type="button" className={s.option} onClick={() => ajouter(o.nom)}>
              <span className={s.optionNom}><Visage nom={o.nom} taille={28} />{o.nom}</span>
              <span className={s.ajout}>{o.n > 0 ? `${o.n} pronostic${o.n > 1 ? 's' : ''}` : 'Ajouter'}</span>
            </button>
          ))}
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
                  <Curseur label={nom} debut={<Visage nom={nom} taille={28} />} max={100} pas={0.5}
                    valeur={nombre(valeur.m2[nom])} format={pourcent} onChange={v => regler(nom, v)} />
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

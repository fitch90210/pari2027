import { useMemo, useState } from 'react'
import Champ from './Champ'
import Icone from './Icone'
import s from './ChoixCandidats.module.css'

const norme = t => String(t ?? '').trim().toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')

const MAX_AFFICHES = 8

// Choix d'un ou plusieurs candidats : sélection en puces au-dessus, recherche, liste à cocher.
// - options : noms proposés ; valeur : noms choisis ; max : nombre maximal de choix
// - libre : permet d'ajouter un nom qui n'est pas dans les options
export default function ChoixCandidats({ options, valeur, onChange, max = Infinity, libre = true, placeholder = 'Chercher un candidat' }) {
  const [requete, setRequete] = useState('')
  const choisi = nom => valeur.some(v => norme(v) === norme(nom))
  const plein = valeur.length >= max

  const bascule = nom => {
    if (choisi(nom)) onChange(valeur.filter(v => norme(v) !== norme(nom)))
    else if (max === 1) onChange([nom])
    else if (!plein) onChange([...valeur, nom])
    setRequete('')
  }

  const q = norme(requete)
  const visibles = useMemo(() => {
    const base = q ? options.filter(o => norme(o).includes(q)) : options
    // les choisis d'abord, pour qu'on voie toujours où l'on en est
    return [...base].sort((a, b) => Number(choisi(b)) - Number(choisi(a))).slice(0, q ? 20 : MAX_AFFICHES)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, q, valeur])

  const nomLibre = requete.trim()
  const peutAjouter = libre && nomLibre.length > 1 && !options.some(o => norme(o) === norme(nomLibre)) && !choisi(nomLibre)

  return (
    <div className={s.choix}>
      <div className={s.selection} aria-live="polite">
        {valeur.length === 0 && <span className={s.vide}>Aucun candidat choisi</span>}
        {valeur.map(nom => (
          <button key={nom} type="button" className={s.puce} onClick={() => bascule(nom)} aria-label={`Retirer ${nom}`}>
            {nom}<Icone nom="fermer" taille={14} epaisseur={2.2} />
          </button>
        ))}
      </div>

      <Champ valeur={requete} onChange={setRequete} placeholder={placeholder} aria-label={placeholder} type="search" autoComplete="off" />

      <div className={s.liste} role="group" aria-label="Candidats proposés">
        {visibles.map(nom => {
          const coche = choisi(nom)
          return (
            <button key={nom} type="button" className={s.option} aria-pressed={coche}
              disabled={!coche && plein && max !== 1} onClick={() => bascule(nom)}>
              <span className={[s.case, coche && s.cochee].filter(Boolean).join(' ')} aria-hidden="true">
                {coche && <Icone nom="coche" taille={13} epaisseur={3} />}
              </span>
              {nom}
            </button>
          )
        })}
        {peutAjouter && (
          <button type="button" className={`${s.option} ${s.libre}`} disabled={plein && max !== 1} onClick={() => bascule(nomLibre)}>
            <span className={s.case} aria-hidden="true"><Icone nom="plus" taille={13} epaisseur={2.6} /></span>
            Ajouter « {nomLibre} »
          </button>
        )}
        {visibles.length === 0 && !peutAjouter && <p className={s.rien}>Aucun résultat</p>}
      </div>
    </div>
  )
}

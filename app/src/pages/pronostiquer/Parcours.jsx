import { useState } from 'react'
import { useGame } from '../../store/GameContext'
import { CANDIDATE_SUGGESTIONS } from '../../data/candidates'
import {
  nombre, totalScores, totalOk, finalistesProbables, premierTourPret, scoreVainqueurOk, valeursPourEnvoi, pourcent,
} from '../../lib/parcours'
import Ecran from '../../ui/Ecran'
import Carte from '../../ui/Carte'
import Bouton from '../../ui/Bouton'
import Champ from '../../ui/Champ'
import Icone from '../../ui/Icone'
import Curseur from '../../ui/Curseur'
import CadreEtape from '../../ui/CadreEtape'
import { Liste, Ligne } from '../../ui/Liste'
import CandidatsScores from './CandidatsScores'
import s from './Parcours.module.css'

const VIDE = { m1: [], m2: {}, m4: '', m5: '' }
const SCORE_PAR_DEFAUT = '52'
const virgule = x => String(Math.round(x * 10) / 10).replace('.', ',')

const ETAPES = [
  { titre: 'Le 1er tour', aide: 'Ajoute les candidats, puis règle le pourcentage de chacun. Le total doit faire 100 %.' },
  { titre: 'Le 2nd tour', aide: 'Tes deux premiers s\'affrontent. Qui gagne, et avec quel score ?' },
  { titre: 'Ton pseudo', aide: 'Il s\'affichera avec ton pronostic. Vérifie, puis valide.' },
]

function Confirmation() {
  return (
    <Ecran>
      <Carte>
        <div className={s.confirme}>
          <span className={s.rond}><Icone nom="coche" taille={28} epaisseur={2.6} /></span>
          <h1 className={s.confirmeTitre}>Pronostic enregistré</h1>
          <p className={s.texte}>Il est visible par tous. Pour changer d'avis, poste simplement un nouveau pronostic.</p>
        </div>
      </Carte>
      <Bouton grand pleineLargeur to="/pronostics" state={{ nouveau: true }}>Voir les pronostics</Bouton>
      <Bouton variante="secondaire" pleineLargeur to="/">Retour à l'accueil</Bouton>
    </Ecran>
  )
}

// Jauge du total du 1er tour, et ce qu'il manque pour continuer.
function Total({ form }) {
  const somme = totalScores(form)
  const ok = totalOk(somme)
  const reste = Math.round((100 - somme) * 10) / 10
  const credites = form.m1.filter(c => nombre(form.m2[c]) > 0).length
  const message = credites < 2 ? 'Au moins deux candidats avec un score'
    : ok ? 'Total juste'
    : reste > 0 ? `${virgule(reste)} % à répartir` : `${virgule(-reste)} % en trop`
  return (
    <div className={s.total}>
      <div className={s.totalLigne}>
        <span><span className={s.totalValeur}>{virgule(somme)} %</span><span className={s.totalSur}>sur 100</span></span>
        <span className={[s.reste, ok && credites >= 2 ? s.resteOk : s.resteAccent].join(' ')}>{message}</span>
      </div>
      <div className={s.jauge} role="meter" aria-label="Total réparti" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(somme)}>
        <div className={[s.jaugePleine, somme > 100.15 && s.jaugeDepasse].filter(Boolean).join(' ')} style={{ width: `${Math.min(100, somme)}%` }} />
      </div>
    </div>
  )
}

// Parcours « Pronostiquer » : 1er tour, 2nd tour, pseudo et récapitulatif, puis confirmation.
// Un pronostic contient toujours les deux tours et n'est plus modifiable une fois envoyé.
export default function Parcours() {
  const { createPronostic, pseudoMemorise } = useGame()
  const [form, setForm] = useState(VIDE)
  const [pseudo, setPseudo] = useState(pseudoMemorise)
  const [index, setIndex] = useState(0)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const [fait, setFait] = useState(false)

  if (fait) return <Confirmation />

  const maj = patch => setForm(f => ({ ...f, ...patch }))
  const finalistes = finalistesProbables(form.m1, form.m2)
  const aller = i => { setErreur(''); setIndex(i); window.scrollTo(0, 0) }
  const retour = () => (index === 0 ? history.back() : aller(index - 1))

  // En quittant le 1er tour : si le vainqueur choisi n'est plus finaliste, on le retire.
  const versSecondTour = () => {
    if (form.m4 && !finalistes.includes(form.m4)) maj({ m4: '', m5: '' })
    aller(1)
  }

  const valider = async () => {
    if (!pseudo.trim()) { setErreur('Indique ton pseudo.'); return }
    setEnvoi(true); setErreur('')
    try {
      await createPronostic(pseudo, valeursPourEnvoi(form))
      setFait(true)
    } catch (e) {
      setErreur(e.message || 'Erreur d\'enregistrement')
    } finally { setEnvoi(false) }
  }

  const etape = ETAPES[index]
  let corps, pied

  if (index === 0) {
    corps = <CandidatsScores options={CANDIDATE_SUGGESTIONS} valeur={{ m1: form.m1, m2: form.m2 }} onChange={maj} />
    pied = <>
      <Total form={form} />
      <Bouton grand pleineLargeur onClick={versSecondTour} disabled={!premierTourPret(form)}>Continuer</Bouton>
    </>
  } else if (index === 1) {
    const vaincu = finalistes.find(f => f !== form.m4)
    corps = (
      <>
        <Carte className={s.affiche}>
          <span className={s.etiquette}>Ton 2nd tour, d'après ton 1er tour</span>
          <span className={s.vainqueur}>{finalistes[0]} contre {finalistes[1]}</span>
        </Carte>
        <h2 className={s.question}>Qui gagne ?</h2>
        <div className={s.choix} role="radiogroup" aria-label="Le vainqueur">
          {finalistes.map(f => (
            <button key={f} type="button" role="radio" aria-checked={form.m4 === f}
              className={[s.option, form.m4 === f && s.optionChoisie].filter(Boolean).join(' ')}
              onClick={() => maj({ m4: f, m5: form.m5 || SCORE_PAR_DEFAUT })}>
              <span className={s.optionNom}>{f}</span>
              <span className={s.optionAide}>{form.m4 === f ? 'Vainqueur' : 'Choisir'}</span>
            </button>
          ))}
        </div>
        {form.m4 && (
          <Carte className={s.pile}>
            <Curseur label={`Score de ${form.m4}`} min={50.5} max={80} pas={0.5}
              valeur={nombre(form.m5)} format={pourcent} onChange={v => maj({ m5: String(v) })} />
            <p className={s.texte}>{vaincu} : {pourcent(virgule(100 - nombre(form.m5)))}</p>
          </Carte>
        )}
      </>
    )
    pied = <Bouton grand pleineLargeur onClick={() => aller(2)} disabled={!form.m4 || !scoreVainqueurOk(form.m5)}>Continuer</Bouton>
  } else {
    const t1 = form.m1.filter(c => nombre(form.m2[c]) > 0)
      .sort((a, b) => nombre(form.m2[b]) - nombre(form.m2[a]))
      .map(c => `${c} ${pourcent(form.m2[c])}`).join(' · ')
    const vaincu = finalistes.find(f => f !== form.m4)
    const t2 = `${form.m4} ${pourcent(form.m5)} · ${vaincu} ${pourcent(virgule(100 - nombre(form.m5)))}`
    corps = (
      <>
        <Carte>
          <Champ label="Pseudo" valeur={pseudo} onChange={v => { setPseudo(v); setErreur('') }}
            maxLength={30} autoComplete="nickname" placeholder="Ton prénom ou un surnom" autoFocus={!pseudo} />
        </Carte>
        <Carte liste>
          <Liste>
            <Ligne titre="1er tour" sousTitre={t1} multiligne onClick={() => aller(0)} />
            <Ligne titre="2nd tour" sousTitre={t2} multiligne onClick={() => aller(1)} />
          </Liste>
        </Carte>
        <p className={s.texte}>Touche un tour pour le modifier. Une fois validé, ton pronostic est public et définitif.</p>
      </>
    )
    pied = <>
      {erreur && <p className={s.erreur} role="alert">{erreur}</p>}
      <Bouton grand pleineLargeur onClick={valider} disabled={envoi || !pseudo.trim()}>
        {envoi ? 'Enregistrement…' : 'Valider mon pronostic'}
      </Bouton>
    </>
  }

  return (
    <CadreEtape titreParcours="Nouveau pronostic" courante={index + 1} total={ETAPES.length} onRetour={retour}
      retourLibelle={index === 0 ? 'Annuler' : 'Retour'} titre={etape.titre} aide={etape.aide} pied={pied}>
      {corps}
    </CadreEtape>
  )
}

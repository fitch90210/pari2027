import { useMemo, useState } from 'react'
import { useGame } from '../../store/GameContext'
import { CANDIDATE_SUGGESTIONS } from '../../data/candidates'
import { VIDE, formDepuis, valeursPourEnvoi, estRempli } from '../../lib/pari'
import { bonusAnticipation } from '../../lib/scoring'
import {
  etapesOuvertes, candidatsDuPari, nombre, totalScores, totalOk,
  repartirEgalement, finalistesProbables, pourcent,
} from '../../lib/parcours'
import Ecran from '../../ui/Ecran'
import Carte from '../../ui/Carte'
import Bouton from '../../ui/Bouton'
import Icone from '../../ui/Icone'
import Curseur from '../../ui/Curseur'
import EtatVide from '../../ui/EtatVide'
import CadreEtape from '../../ui/CadreEtape'
import ChoixCandidats from '../../ui/ChoixCandidats'
import CandidatsScores from './CandidatsScores'
import { Liste, Ligne } from '../../ui/Liste'
import s from './Parcours.module.css'

const FENETRE_MS = 24 * 3600 * 1000

const TITRES = {
  m12: { titre: 'Candidats et scores du 1er tour', aide: 'Ajoute un candidat, puis règle son score. Le total doit faire 100 %. +2 pts par candidat correct (+3 si le bon nombre), +2 pts par score à 2 points près.' },
  m45: { titre: 'Vainqueur et son score', aide: 'Choisis le vainqueur, puis donne son score au second tour. +6 pts pour le vainqueur, +2 pts si le score est à 2 points près.' },
  m1: { titre: 'Candidats au 1er tour', aide: 'Qui sera sur la ligne de départ ? +2 pts par candidat correct, +3 pts si tu as le bon nombre.' },
  m2: { titre: 'Scores du 1er tour', aide: 'Répartis 100 % entre tes candidats. À 2 points près du résultat : +2 pts.' },
  m3: { titre: 'Les deux finalistes', aide: 'Qui sera qualifié pour le second tour ? +8 pts si les deux sont corrects, +3 pts si un seul.' },
  m4: { titre: 'Le vainqueur', aide: 'Qui remportera le second tour ? +6 pts.' },
  m5: { titre: 'Score du vainqueur', aide: 'Quel score au second tour ? +2 pts à 2 points près.' },
}

const jourHeure = ms => new Date(ms).toLocaleString('fr-FR', {
  day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris',
})

// Résumé d'une valeur de pari, pour le récapitulatif
function resume(k, form, candidats) {
  if (k === 'm12') {
    return form.m1.length ? form.m1.map(c => (nombre(form.m2[c]) > 0 ? `${c} ${pourcent(form.m2[c])}` : c)).join(' · ') : null
  }
  if (k === 'm45') {
    if (!form.m4) return null
    return form.m5 !== '' ? `${form.m4} · ${pourcent(form.m5)}` : form.m4
  }
  if (k === 'm1') return form.m1.length ? `${form.m1.length} : ${form.m1.join(', ')}` : null
  if (k === 'm2') {
    const l = candidats.filter(c => nombre(form.m2[c]) > 0).map(c => `${c} ${pourcent(form.m2[c])}`)
    return l.length ? l.join(' · ') : null
  }
  if (k === 'm3') { const f = form.m3.filter(Boolean); return f.length ? f.join(' et ') : null }
  if (k === 'm4') return form.m4 || null
  if (k === 'm5') return form.m5 !== '' ? pourcent(form.m5) : null
  return null
}

function Confirmation({ correction, maintenant, bonus, onFini }) {
  return (
    <Ecran>
      <Carte>
        <div className={s.confirme}>
          <span className={s.rond}><Icone nom="coche" taille={28} epaisseur={2.6} /></span>
          <h1 className={s.confirmeTitre}>{correction ? 'Correction enregistrée' : 'Pari enregistré'}</h1>
          <p className={s.texte}>
            Tu peux encore le modifier jusqu'au {jourHeure(maintenant + FENETRE_MS)}. Ensuite, il est figé :
            pour changer d'avis, pose un nouveau pari.
          </p>
          {bonus > 0 && <p className={s.texte}><span className={s.accent}>+{bonus} pts</span> de bonus d'anticipation sur ce pari.</p>}
        </div>
      </Carte>
      <Bouton grand pleineLargeur to="/paris" state={{ pariPose: true }}>Voir tous les paris</Bouton>
      <Bouton variante="secondaire" pleineLargeur to="/" onClick={onFini}>Retour à l'accueil</Bouton>
    </Ecran>
  )
}

// Parcours d'un pari (nouveau ou correction) : une étape par pronostic ouvert, un récapitulatif, une confirmation.
// `demo` (mode démo) : { periode, officiels, finalistes, onSoumettre(valeurs) → résultat, rendu(résultat) → écran }.
// Même parcours, mais rien n'est enregistré et le joueur n'existe pas.
export default function Parcours({ joueur, pariEdit, onChangerJoueur, demo }) {
  const { paris, periodes, periodeEnCours, officialCandidatesR1: officielsJeu, officialFinalists: finalistesJeu, createPari, updatePari, now } = useGame()

  const officiels = demo ? demo.officiels : officielsJeu
  const officialFinalists = demo ? demo.finalistes : finalistesJeu
  const periode = demo ? demo.periode : pariEdit ? periodes.find(p => p.id === pariEdit.periode) : periodeEnCours
  const etapes = useMemo(() => etapesOuvertes(periode), [periode])

  const [form, setForm] = useState(() => {
    if (!periode || demo) return VIDE
    if (pariEdit) return formDepuis(pariEdit, periode, officiels)
    const dernier = [...paris].filter(p => p.player_id === joueur.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at) || b.id - a.id)[0]
    return formDepuis(dernier, periode, officiels)
  })
  const [index, setIndex] = useState(0) // 0..etapes.length ; etapes.length = récapitulatif
  const [depuisRecap, setDepuisRecap] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState(null)
  const [fait, setFait] = useState(null) // { maintenant, bonus }

  if (!periode) {
    return <Ecran><Carte><EtatVide titre="Le jeu est fermé" texte="Plus aucun pari n'est possible : les classements sont figés." action={<Bouton to="/classements">Voir le classement</Bouton>} /></Carte></Ecran>
  }
  if (pariEdit && (periodeEnCours?.id !== pariEdit.periode || new Date(pariEdit.created_at).getTime() < now - FENETRE_MS)) {
    return <Ecran><Carte><EtatVide titre="Ce pari n'est plus modifiable" texte="Un pari se corrige pendant 24 h. Pour changer d'avis, pose un nouveau pari." action={<Bouton to="/parier">Nouveau pari</Bouton>} /></Carte></Ecran>
  }
  if (periode.id >= 3 && etapes.includes('m2') && officiels.length === 0) {
    return <Ecran><Carte><EtatVide titre="Bientôt" texte="La liste officielle des candidats n'est pas encore publiée : le pari s'ouvrira dès qu'elle le sera." /></Carte></Ecran>
  }

  const candidats = candidatsDuPari(form, periode, officiels)
  const maj = patch => setForm(f => ({ ...f, ...patch }))
  const courante = etapes[index] // undefined = récapitulatif
  const enRecap = index >= etapes.length

  const aller = i => { setErreur(null); setIndex(i) }
  const suivant = () => {
    if ((courante === 'm2' || courante === 'm12') && etapes.includes('m3') && form.m3.filter(Boolean).length === 0) {
      const f = finalistesProbables(candidats, form.m2)
      if (f) maj({ m3: f })
    }
    aller(depuisRecap ? etapes.length : index + 1)
    if (depuisRecap) setDepuisRecap(false)
  }
  const retour = () => {
    if (depuisRecap) { setDepuisRecap(false); aller(etapes.length) }
    else if (index === 0) history.back()
    else aller(index - 1)
  }
  const modifierDepuisRecap = i => { setDepuisRecap(true); aller(i) }

  const total = etapes.length + 1
  const valeurs = valeursPourEnvoi(form, periode, officiels)
  const bonus = bonusAnticipation(new Date(now).toISOString(), periodes)

  const valider = async () => {
    if (!estRempli(valeurs)) { setErreur({ message: 'Remplis au moins un pronostic.' }); return }
    setEnvoi(true); setErreur(null)
    try {
      if (demo) { setFait({ resultat: demo.onSoumettre(valeurs) }); return }
      if (pariEdit) await updatePari(pariEdit.id, joueur.id, valeurs)
      else await createPari(joueur.id, valeurs)
      setFait({ maintenant: Date.now(), bonus: pariEdit ? bonusAnticipation(pariEdit.created_at, periodes) : bonus })
    } catch (e) {
      setErreur({ message: e.message || 'Erreur de sauvegarde', code: e.code })
    } finally { setEnvoi(false) }
  }

  if (fait && demo) return demo.rendu(fait.resultat)
  if (fait) return <Confirmation correction={!!pariEdit} maintenant={fait.maintenant} bonus={fait.bonus} />

  // ── Récapitulatif ──
  if (enRecap) {
    const infoLigne = demo
      ? 'Rien n\'est enregistré : ce pari sert seulement à calculer ton score.'
      : pariEdit
      ? `Tu peux corriger ce pari jusqu'au ${jourHeure(new Date(pariEdit.created_at).getTime() + FENETRE_MS)}.`
      : 'Ce pari sera daté d\'aujourd\'hui et modifiable pendant 24 h.'
    return (
      <CadreEtape courante={total} total={total} onRetour={retour} retourLibelle="Retour"
        titreParcours={demo ? 'Mode démo' : pariEdit ? 'Correction' : 'Nouveau pari'}
        titre="Vérifie ton pari" aide="Touche une ligne pour la modifier."
        pied={<>
          {erreur && (
            <p className={s.erreur} role="alert">
              {erreur.message}{' '}
              {(erreur.code === 'bad_code' || erreur.code === 'no_code') && <button type="button" onClick={onChangerJoueur} className={s.lien}>Se reconnecter</button>}
            </p>
          )}
          <Bouton grand pleineLargeur onClick={valider} disabled={envoi}>
            {envoi ? 'Enregistrement…' : demo ? 'Voir mon score' : pariEdit ? 'Enregistrer la correction' : 'Valider mon pari'}
          </Bouton>
        </>}>
        <Carte liste>
          <Liste>
            {etapes.map((k, i) => {
              const v = resume(k, form, candidats)
              return <Ligne key={k} titre={TITRES[k].titre} sousTitre={v ?? 'Non renseigné'} multiligne onClick={() => modifierDepuisRecap(i)} />
            })}
          </Liste>
        </Carte>
        <Carte>
          <div className={s.infos}>
            <span className={s.infoTitre}>{demo ? 'Pari de démonstration' : `Pari de ${joueur.name}`}</span>
            <span className={s.infoTexte}>{infoLigne}</span>
            {!demo && !pariEdit && bonus > 0 && <span className={s.infoTexte}><span className={s.accent}>+{bonus} pts</span> de bonus d'anticipation aujourd'hui.</span>}
            {!demo && (
              <button type="button" onClick={onChangerJoueur} className={[s.lien, s.lienDiscret].join(' ')}>
                Ce n'est pas toi ? Changer de joueur
              </button>
            )}
          </div>
        </Carte>
      </CadreEtape>
    )
  }

  // ── Étapes ──
  const t = TITRES[courante]
  let corps, vide, pied

  // Pied commun aux étapes de scores : total sur 100 % et bouton qui s'adapte
  const piedScores = () => {
    const somme = totalScores(form, candidats)
    const ok = totalOk(somme)
    const reste = Math.round((100 - somme) * 10) / 10
    return (
      <>
        <div className={s.total}>
          <div className={s.totalLigne}>
            <span><span className={s.totalValeur}>{String(Math.round(somme * 10) / 10).replace('.', ',')} %</span><span className={s.totalSur}>sur 100</span></span>
            <span className={[s.reste, ok ? s.resteOk : s.resteAccent].join(' ')}>
              {ok ? 'Total juste' : reste > 0 ? `${String(reste).replace('.', ',')} % à répartir` : `${String(-reste).replace('.', ',')} % en trop`}
            </span>
          </div>
          <div className={s.jauge} role="meter" aria-label="Total réparti" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(somme)}>
            <div className={[s.jaugePleine, somme > 100.15 && s.jaugeDepasse].filter(Boolean).join(' ')} style={{ width: `${Math.min(100, somme)}%` }} />
          </div>
        </div>
        <Bouton grand pleineLargeur variante={ok ? 'principal' : 'secondaire'} onClick={suivant}>
          {ok ? 'Continuer' : somme > 0 ? 'Continuer quand même' : 'Passer'}
        </Bouton>
      </>
    )
  }

  if (courante === 'm12') {
    vide = form.m1.length === 0
    corps = <CandidatsScores options={CANDIDATE_SUGGESTIONS} valeur={{ m1: form.m1, m2: form.m2 }} onChange={maj} />
    pied = piedScores()
  } else if (courante === 'm2') {
    vide = totalScores(form, candidats) === 0
    corps = candidats.length === 0
      ? <Carte><EtatVide titre="Aucun candidat" texte="La liste des candidats n'est pas disponible." /></Carte>
      : (
        <>
          <Carte liste className={s.scores}>
            {candidats.map(c => (
              <Curseur key={c} label={c} max={60} pas={0.5}
                valeur={nombre(form.m2[c])} format={pourcent}
                onChange={v => {
                  const m2 = { ...form.m2 }
                  if (v === 0) delete m2[c]; else m2[c] = String(v)
                  maj({ m2 })
                }} />
            ))}
          </Carte>
          <Bouton variante="secondaire" className={s.egal} onClick={() => maj({ m2: repartirEgalement(candidats) })}>Répartir à égalité</Bouton>
        </>
      )
    pied = piedScores()
  } else if (courante === 'm3') {
    const options = candidats.length ? candidats : CANDIDATE_SUGGESTIONS
    const choisis = form.m3.filter(Boolean)
    vide = choisis.length === 0
    corps = <ChoixCandidats options={options} valeur={choisis} max={2} libre={periode.id < 3 && candidats.length === 0}
      onChange={m3 => maj({ m3 })} />
  } else if (courante === 'm4') {
    const finalistes = form.m3.filter(Boolean)
    const options = finalistes.length ? finalistes
      : officialFinalists.length === 2 ? officialFinalists
      : officiels.length ? officiels : CANDIDATE_SUGGESTIONS
    vide = !form.m4
    corps = <ChoixCandidats options={options} valeur={form.m4 ? [form.m4] : []} max={1}
      libre={periode.id < 3 && finalistes.length === 0} onChange={([v]) => maj({ m4: v ?? '' })} />
  } else if (courante === 'm45') {
    const finalistes = form.m3.filter(Boolean)
    const options = finalistes.length ? finalistes
      : officialFinalists.length === 2 ? officialFinalists
      : officiels.length ? officiels : CANDIDATE_SUGGESTIONS
    vide = !form.m4
    corps = (
      <>
        <ChoixCandidats options={options} valeur={form.m4 ? [form.m4] : []} max={1}
          libre={periode.id < 3 && finalistes.length === 0}
          onChange={([v]) => maj(v ? { m4: v } : { m4: '', m5: '' })} />
        {form.m4 && (
          <Carte className={s.pile}>
            <Curseur label={`Score de ${form.m4} au second tour`} min={40} max={80} pas={0.5}
              valeur={form.m5 === '' ? 55 : nombre(form.m5)} format={pourcent} onChange={v => maj({ m5: String(v) })} />
            <p className={s.texte}>{form.m5 === '' ? 'Déplace le curseur pour donner son score, ou continue sans.' : 'Tu peux encore ajuster.'}</p>
          </Carte>
        )}
      </>
    )
  } else if (courante === 'm5') {
    vide = form.m5 === ''
    corps = (
      <Carte className={s.pile}>
        <span className={s.vainqueur}>{form.m4 || 'Le vainqueur'}</span>
        <Curseur label="Score au second tour" min={40} max={80} pas={0.5} valeur={form.m5 === '' ? 55 : nombre(form.m5)}
          format={pourcent} onChange={v => maj({ m5: String(v) })} />
        <p className={s.texte}>{form.m5 === '' ? 'Déplace le curseur pour donner ton score, ou passe cette étape.' : 'Tu peux encore ajuster.'}</p>
      </Carte>
    )
  }

  pied = pied ?? (
    <Bouton grand pleineLargeur variante={vide ? 'secondaire' : 'principal'} onClick={suivant}>
      {vide ? 'Passer' : 'Continuer'}
    </Bouton>
  )

  return (
    <CadreEtape courante={index + 1} total={total} onRetour={retour}
      retourLibelle={index === 0 && !depuisRecap ? 'Annuler' : 'Retour'}
      titreParcours={demo ? 'Mode démo' : pariEdit ? 'Correction' : 'Nouveau pari'}
      titre={t.titre} aide={t.aide} pied={pied}>
      {corps}
    </CadreEtape>
  )
}

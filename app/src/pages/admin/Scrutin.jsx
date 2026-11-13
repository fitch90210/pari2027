import { useState } from 'react'
import { useGame } from '../../store/GameContext'
import {
  parseListe, lireScores, finalistesDepuisScores, totalSaisi, totalJuste, resultatSecondTour, scoreAInitial,
} from '../../lib/scrutin'
import Carte from '../../ui/Carte'
import Bouton from '../../ui/Bouton'
import Champ from '../../ui/Champ'
import Pastille from '../../ui/Pastille'
import Retour from './Retour'
import s from './Admin.module.css'

const virgule = x => String(x).replace('.', ',')

// Petit hook d'enregistrement : envoi, succès, erreur.
function useEnvoi() {
  const [envoi, setEnvoi] = useState(false)
  const [ok, setOk] = useState(false)
  const [erreur, setErreur] = useState('')
  const lancer = async fn => {
    setEnvoi(true); setErreur(''); setOk(false)
    try { await fn(); setOk(true) } catch (e) { setErreur(e.message) } finally { setEnvoi(false) }
  }
  return { envoi, ok, erreur, lancer, setErreur, setOk }
}

function Etape({ n, titre, etat, aide, children }) {
  return (
    <Carte>
      <div className={s.etape}>
        <div className={s.etapeEntete}>
          <h2 className={s.etapeTitre}>{n}. {titre}</h2>
          {etat}
        </div>
        <p className={s.texte}>{aide}</p>
        {children}
      </div>
    </Carte>
  )
}

// Étape 1 : la liste officielle des candidats.
function ListeOfficielle({ officiels, onSave }) {
  const [brut, setBrut] = useState(officiels.join('\n'))
  const e = useEnvoi()
  return (
    <Etape n={1} titre="Candidats du 1er tour"
      etat={officiels.length > 0 ? <Pastille accent>{officiels.length} candidats</Pastille> : <Pastille>À venir</Pastille>}
      aide="Saisis la liste officielle des candidats, un par ligne, dès qu'elle est publiée. Elle sert à saisir les résultats du 1er tour.">
      <form className={s.formulaire} onSubmit={ev => { ev.preventDefault(); e.lancer(() => onSave(parseListe(brut))) }}>
        <Champ zone label="Candidats (un par ligne)" valeur={brut} onChange={v => { setBrut(v); e.setOk(false) }} placeholder={'Marine Le Pen\nJean-Luc Mélenchon\n…'} />
        <Retour ok={e.ok} erreur={e.erreur} />
        <Bouton type="submit" pleineLargeur disabled={e.envoi}>{e.envoi ? 'Enregistrement…' : 'Enregistrer la liste'}</Bouton>
      </form>
    </Etape>
  )
}

// Étape 2 : scores réels du 1er tour. Les deux plus hauts désignent les finalistes.
function ResultatsPremierTour({ officiels, results, onSave }) {
  const [saisis, setSaisis] = useState(() => Object.fromEntries(officiels.map(c => [c, results?.scores?.[c] != null ? String(results.scores[c]) : ''])))
  const e = useEnvoi()
  const fait = results?.scores && Object.keys(results.scores).length > 0

  if (officiels.length === 0) {
    return <Etape n={2} titre="Résultats du 1er tour" etat={<Pastille>Après le 1er tour</Pastille>} aide="Saisis d'abord la liste des candidats (étape 1)." />
  }
  const finalistes = finalistesDepuisScores(officiels, saisis)
  const total = totalSaisi(officiels, saisis)
  const juste = totalJuste(officiels, saisis)

  const enregistrer = ev => {
    ev.preventDefault()
    const { nombres, manquants } = lireScores(officiels, saisis)
    if (manquants.length) { e.setErreur('Tous les scores doivent être renseignés.'); return }
    if (finalistes.length < 2) { e.setErreur('Impossible de déterminer deux finalistes.'); return }
    e.lancer(() => onSave({
      candidates: officiels, scores: nombres, finalists: finalistes,
      winner: results?.winner ?? '', winnerScore: results?.winnerScore ?? null, // le 2nd tour reste inchangé
    }))
  }

  return (
    <Etape n={2} titre="Résultats du 1er tour"
      etat={fait ? <Pastille accent>Enregistrés</Pastille> : <Pastille>Après le 1er tour</Pastille>}
      aide="Saisis le score réel de chaque candidat. Les deux plus hauts désignent automatiquement les finalistes.">
      <form className={s.formulaire} onSubmit={enregistrer}>
        {officiels.map(c => (
          <div key={c} className={s.scoreLigne}>
            <span className={s.scoreNom}>{c}</span>
            <Champ aria-label={`Score de ${c}`} type="number" step="0.1" min="0" max="100" inputMode="decimal" placeholder="0,0"
              valeur={saisis[c] ?? ''} onChange={v => { setSaisis(x => ({ ...x, [c]: v })); e.setOk(false) }} />
          </div>
        ))}
        <div className={s.total}>
          <span>Total</span>
          <span className={`${s.totalValeur} ${juste ? s.juste : s.faux}`}>{virgule(Math.round(total * 10) / 10)} %{juste ? ' ✓' : ''}</span>
        </div>
        {finalistes.length === 2 && (
          <div className={s.calcul}>
            <span className={s.calculTitre}>Finalistes calculés automatiquement</span>
            <span className={s.calculValeur}>{finalistes[0]} contre {finalistes[1]}</span>
          </div>
        )}
        <Retour ok={e.ok} erreur={e.erreur} />
        <Bouton type="submit" pleineLargeur disabled={e.envoi}>{e.envoi ? 'Enregistrement…' : 'Enregistrer le 1er tour'}</Bouton>
      </form>
    </Etape>
  )
}

// Étape 3 : score du 1er finaliste au 2nd tour. Le vainqueur et le complément sont calculés.
function ResultatsSecondTour({ results, onSave }) {
  const finalistes = results?.finalists ?? []
  const [scoreA, setScoreA] = useState(() => scoreAInitial(results))
  const e = useEnvoi()
  const fait = results?.winnerScore != null

  if (finalistes.length < 2) {
    return <Etape n={3} titre="Résultats du 2nd tour" etat={<Pastille>Après le 2nd tour</Pastille>} aide="Les finalistes sont connus après la saisie du 1er tour (étape 2)." />
  }
  const r = resultatSecondTour(finalistes, scoreA)

  // Efface le vainqueur et son score ; les résultats du 1er tour (et donc les finalistes) restent.
  const vider = () => {
    if (!window.confirm('Vider les résultats du 2nd tour ? Le vainqueur et le score enregistrés seront effacés (le 1er tour reste).')) return
    e.lancer(async () => {
      await onSave({ ...results, winner: '', winnerScore: null })
      setScoreA('')
    })
  }

  return (
    <Etape n={3} titre="Résultats du 2nd tour"
      etat={fait ? <Pastille accent>{results.winner} · {virgule(results.winnerScore)} %</Pastille> : <Pastille>Après le 2nd tour</Pastille>}
      aide="Saisis le score réel du premier finaliste. Le vainqueur et le score de l'autre sont calculés.">
      <form className={s.formulaire} onSubmit={ev => { ev.preventDefault(); if (!r) { e.setErreur('Score invalide.'); return } e.lancer(() => onSave({ ...results, winner: r.winner, winnerScore: r.winnerScore })) }}>
        <div className={s.scoreLigne}>
          <span className={s.scoreNom}>{finalistes[0]}</span>
          <Champ aria-label={`Score de ${finalistes[0]}`} type="number" step="0.1" min="0" max="100" inputMode="decimal" placeholder="0,0"
            valeur={scoreA} onChange={v => { setScoreA(v); e.setOk(false) }} />
        </div>
        <div className={s.scoreLigne}>
          <span className={s.scoreNom}>{finalistes[1]}</span>
          <span className={s.totalValeur}>{r ? `${virgule(r.scoreB)} %` : '—'}</span>
        </div>
        {r && (
          <div className={s.calcul}>
            <span className={s.calculTitre}>Vainqueur calculé automatiquement</span>
            <span className={s.calculValeur}>{r.winner} · {virgule(r.winnerScore)} %</span>
          </div>
        )}
        <Retour ok={e.ok} erreur={e.erreur} />
        <Bouton type="submit" pleineLargeur disabled={e.envoi || !r}>{e.envoi ? 'Enregistrement…' : 'Enregistrer le 2nd tour'}</Bouton>
        {fait && (
          <Bouton type="button" variante="secondaire" pleineLargeur disabled={e.envoi} onClick={vider}>Vider le 2nd tour</Bouton>
        )}
      </form>
    </Etape>
  )
}

export default function Scrutin() {
  const { officialCandidatesR1, results, saveOfficialCandidatesR1, saveResults } = useGame()
  return (
    <div className={s.pile}>
      <p className={s.texte}>Dans l'ordre du calendrier électoral : la liste officielle, puis les résultats de chaque tour. Pour l'instant, ils sont seulement enregistrés : ils ne changent rien sur le site.</p>
      <ListeOfficielle officiels={officialCandidatesR1} onSave={saveOfficialCandidatesR1} />
      <ResultatsPremierTour key={officialCandidatesR1.join('|')} officiels={officialCandidatesR1} results={results} onSave={saveResults} />
      <ResultatsSecondTour key={(results?.finalists ?? []).join('|')} results={results} onSave={saveResults} />
    </div>
  )
}

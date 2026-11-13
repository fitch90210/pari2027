import { useState } from 'react'
import { useGame } from '../store/GameContext'
import { resultatsComplets } from '../lib/pari'
import { jouerDemo } from '../lib/demo'
import { detailPari } from '../lib/detailPari'
import Ecran from '../ui/Ecran'
import Carte from '../ui/Carte'
import Bouton from '../ui/Bouton'
import Segmente from '../ui/Segmente'
import EtatVide from '../ui/EtatVide'
import Parcours from './parier/Parcours'
import detail from './paris/DetailPari.module.css'
import s from './Demo.module.css'

const rangEnTexte = n => (n === 1 ? '1er' : `${n}e`)

function Resultat({ r, periodes, results, onAutre }) {
  const d = detailPari(r.pari, r.periode, results, periodes)
  return (
    <Ecran surtitre={`Mode démo · ${r.periode.label}`}>
      <Carte>
        <div className={s.resultat}>
          <span className={s.score}>{d.total}<span className={s.scoreUnite}> pts</span></span>
          {r.rang != null && (
            <span className={s.rang}>
              Tu te serais classé·e <strong>{rangEnTexte(r.rang)}</strong> sur {r.sur} au classement général.
            </span>
          )}
          <span className={s.rang}>
            Barème {d.bareme} pts + <span className={s.accent}>{d.bonus} pts</span> de bonus d'anticipation
            (pari posé au début de la période).
          </span>
        </div>
      </Carte>

      <section className={s.pile}>
        <h2 className={s.titreSection}>Détail, pronostic par pronostic</h2>
        <div className={detail.lignes}>
          {d.lignes.map(l => (
            <div key={l.cle} className={detail.ligne}>
              <span className={detail.corps}>
                <span className={detail.titre}>{l.titre}</span>
                {l.items
                  ? <ul className={detail.items}>{l.items.map(i => (
                      <li key={i.nom} className={detail.item}><span>{i.nom}</span><span className={[detail.pct, !i.valeur && detail.vide].filter(Boolean).join(' ')}>{i.valeur ?? '—'}</span></li>))}</ul>
                  : <span className={[detail.valeur, !l.valeur && detail.vide].filter(Boolean).join(' ')}>{l.valeur ?? 'Non renseigné'}</span>}
              </span>
              <span className={[detail.points, l.points > 0 && detail.gagne].filter(Boolean).join(' ')}>+{l.points}</span>
            </div>
          ))}
        </div>
      </section>

      <div className={s.actions}>
        <Bouton grand pleineLargeur onClick={onAutre}>Refaire un essai</Bouton>
        <Bouton variante="secondaire" pleineLargeur to="/classements">Voir le classement</Bouton>
      </div>
      <p className={s.note}>Rien n'a été enregistré : tu ne figures dans aucun classement.</p>
    </Ecran>
  )
}

// Mode démo : une fois les résultats connus, n'importe qui peut parier « à rebours » pour voir son score.
// Même parcours que le vrai pari, mais tout est calculé dans le navigateur.
export default function Demo() {
  const { periodes, paris, results } = useGame()
  const [periodeId, setPeriodeId] = useState(1)
  const [essai, setEssai] = useState(null) // null = choix de la période ; sinon numéro de l'essai en cours

  if (!resultatsComplets(results)) {
    return (
      <Ecran titre="Et si tu avais parié ?">
        <Carte><EtatVide titre="Bientôt" texte="Le mode démo ouvre quand les résultats officiels des deux tours sont connus." action={<Bouton to="/" variante="secondaire">Retour à l'accueil</Bouton>} /></Carte>
      </Ecran>
    )
  }

  const periode = periodes.find(p => p.id === periodeId)

  if (essai == null) {
    return (
      <Ecran titre="Et si tu avais parié ?" surtitre="Mode démo">
        <p className={s.texte}>
          Choisis un moment de la campagne et pose un pari comme si tu jouais à cette date. Tu verras le score que tu aurais obtenu
          et la place que tu aurais prise.
        </p>
        <Segmente label="Période" valeur={periodeId} onChange={setPeriodeId}
          options={periodes.map(p => ({ valeur: p.id, libelle: `P${p.id}` }))} />
        <Carte>
          <div className={s.resultat}>
            <span className={s.rang}><strong>{periode.id}. {periode.label}</strong></span>
            <span className={s.rang}>{periode.scored.length === 5 ? 'Les cinq pronostics sont ouverts.' : `${periode.scored.length} pronostics ouverts : seuls ceux-là sont proposés.`}</span>
          </div>
        </Carte>
        <Bouton grand pleineLargeur onClick={() => setEssai(1)}>Commencer</Bouton>
        <p className={s.note}>Rien n'est enregistré et tu n'entres dans aucun classement.</p>
      </Ecran>
    )
  }

  return (
    <Parcours
      key={`${periodeId}-${essai}`}
      demo={{
        periode, officiels: results.candidates, finalistes: results.finalists,
        onSoumettre: valeurs => jouerDemo(valeurs, periode, periodes, paris, results),
        rendu: r => <Resultat r={r} periodes={periodes} results={results} onAutre={() => setEssai(null)} />,
      }}
    />
  )
}

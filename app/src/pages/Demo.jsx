import { useState } from 'react'
import { useGame } from '../store/GameContext'
import PariForm from '../components/PariForm'
import PariScoreDetail from '../components/PariScoreDetail'
import { VIDE, resultatsComplets } from '../lib/pari'
import { scorePari, classementPeriode } from '../lib/scoring'

const DEMO_ID = '__demo__'

// Mode démo : une fois les résultats connus, n'importe qui peut parier « à rebours »
// pour voir son score. Tout est calculé dans le navigateur : rien n'est enregistré.
export default function Demo() {
  const { periodes, paris, results } = useGame()
  const [periodeId, setPeriodeId] = useState(1)
  const [resultat, setResultat] = useState(null)
  const [essai, setEssai] = useState(0)

  const periode = periodes.find(p => p.id === periodeId)

  const header = (
    <header style={{ paddingTop: 'var(--sp-10)', paddingBottom: 'var(--sp-6)', borderBottom: '3px solid var(--text-primary)', marginBottom: 'var(--sp-8)' }}>
      <div style={{
        fontFamily: 'var(--font)', fontSize: '0.7rem', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--red)', marginBottom: 'var(--sp-3)',
      }}>
        Pari 2027 · Mode démo
      </div>
      <h2 style={{ fontStyle: 'italic', marginBottom: 'var(--sp-3)' }}>Et si tu avais parié ?</h2>
      <p style={{ fontFamily: 'var(--font)', fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
        Remplis un pari comme si tu jouais dans une période, et vois le score que tu aurais obtenu.
        Rien n'est enregistré et tu n'entres dans aucun classement.
      </p>
    </header>
  )

  if (!resultatsComplets(results)) {
    return (
      <div className="page">
        <div className="container" style={{ maxWidth: 700 }}>
          {header}
          <div className="card">
            Le mode démo ouvre quand les résultats officiels des deux tours sont connus.
          </div>
        </div>
      </div>
    )
  }

  const soumettre = (valeurs) => {
    const pari = {
      id: -1, player_id: DEMO_ID, periode: periode.id,
      created_at: new Date().toISOString(), ...valeurs,
    }
    const scores = scorePari(pari, results, periode)
    const classement = classementPeriode([...paris, pari], periode, results)
    const moi = classement.find(e => e.player_id === DEMO_ID)
    setResultat({ pari, periode, scores, rang: moi?.rank, sur: classement.length })
  }

  const changerPeriode = (id) => { setPeriodeId(id); setResultat(null); setEssai(n => n + 1) }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 700 }}>
        {header}

        <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap', marginBottom: 'var(--sp-6)' }}>
          {periodes.map(p => (
            <button key={p.id} type="button"
              className={`btn btn-sm ${p.id === periodeId ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => changerPeriode(p.id)}>
              {p.id}. {p.label}
            </button>
          ))}
        </div>

        <div className="card" style={{ marginBottom: 'var(--sp-6)' }}>
          <PariForm
            key={`${periodeId}-${essai}`}
            periode={periode}
            initial={VIDE}
            officiels={results.candidates}
            finalistesOfficiels={results.finalists}
            intro={`Règles de la période « ${periode.label} » : seuls les pronostics ouverts à ce moment-là sont proposés.`}
            submitLabel="Voir mon score"
            onSubmit={soumettre}
          />
        </div>

        {resultat && (
          <div className="card">
            <div className="flex items-center justify-between mb-4" style={{ gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ marginBottom: 4 }}>{resultat.scores.total} pts</h3>
                {resultat.rang != null && (
                  <span className="text-muted text-sm">
                    Tu te serais classé·e {resultat.rang === 1 ? '1er' : `${resultat.rang}e`} sur {resultat.sur} dans la période « {resultat.periode.label} ».
                  </span>
                )}
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => { setResultat(null); setEssai(n => n + 1) }}>
                Recommencer
              </button>
            </div>
            <PariScoreDetail pari={resultat.pari} periode={resultat.periode} scores={resultat.scores} results={results} />
          </div>
        )}
      </div>
    </div>
  )
}

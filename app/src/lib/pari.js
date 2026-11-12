// Aides pour les formulaires de pari (pré-remplissage, valeurs envoyées).

export const VIDE = { m1: [], m2: {}, m3: ['', ''], m4: '', m5: '' }


// Formulaire pré-rempli depuis un pari, limité aux pronostics ouverts de la période.
export function formDepuis(pari, periode, officiels) {
  if (!pari) return VIDE
  const ouvert = (k) => periode.scored.includes(k)
  let m2 = ouvert('m2') ? (pari.m2 ?? {}) : {}
  // Dès la période 3, seuls les candidats officiels sont acceptés par le serveur
  if (periode.id >= 3) m2 = Object.fromEntries(Object.entries(m2).filter(([c]) => officiels.includes(c)))
  return {
    m1: ouvert('m1') ? (pari.m1 ?? []) : [],
    m2: Object.fromEntries(Object.entries(m2).map(([c, v]) => [c, String(v)])),
    m3: ouvert('m3') && pari.m3?.length ? [...pari.m3, '', ''].slice(0, 2) : ['', ''],
    m4: ouvert('m4') ? (pari.m4 ?? '') : '',
    m5: ouvert('m5') && pari.m5 != null ? String(pari.m5) : '',
  }
}

// Valeurs envoyées au serveur (qui remet de toute façon à vide les pronostics fermés).
export function valeursPourEnvoi(form, periode, officiels) {
  const candidats = periode.id >= 3 ? officiels : form.m1
  const m2 = Object.fromEntries(
    Object.entries(form.m2)
      .filter(([c, v]) => candidats.includes(c) && v !== '' && !isNaN(parseFloat(v)))
      .map(([c, v]) => [c, parseFloat(v)])
  )
  return {
    m1: form.m1,
    m2,
    m3: form.m3.filter(Boolean),
    m4: form.m4.trim(),
    m5: form.m5 !== '' && !isNaN(parseFloat(form.m5)) ? parseFloat(form.m5) : null,
  }
}

export function estRempli(v) {
  return v.m1.length > 0 || Object.keys(v.m2).length > 0 || v.m3.length > 0 || v.m4 !== '' || v.m5 != null
}

// Les résultats officiels sont-ils tous saisis ? (condition du mode démo)
export function resultatsComplets(results) {
  return !!(results?.candidates?.length && results.scores && results.finalists?.length
    && results.winner && results.winnerScore != null)
}

// Période en cours : la première dont la fin n'est pas passée (null = jeu fermé).
// Affichage uniquement : c'est le serveur qui décide de la période d'un pari.
export function periodeCourante(periodes, now = new Date()) {
  const t = now.getTime()
  return [...periodes]
    .sort((a, b) => a.id - b.id)
    .find(p => new Date(p.ends_at).getTime() > t) ?? null
}

// ── Heure de Paris ↔ ISO (UTC) ───────────────────────────────
// L'admin saisit les bornes en heure de Paris ; la base les stocke en UTC.

const FORMAT_PARIS = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Paris', hourCycle: 'h23',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
})

// ISO (UTC) → « YYYY-MM-DDTHH:mm » en heure de Paris (valeur d'un <input type="datetime-local">)
export function isoVersParis(iso) {
  return FORMAT_PARIS.format(new Date(iso)).replace(' ', 'T')
}

// « YYYY-MM-DDTHH:mm » en heure de Paris → ISO (UTC)
export function parisVersIso(local) {
  const [d, h] = local.split('T')
  const [y, mo, j] = d.split('-').map(Number)
  const [hh, mm] = h.split(':').map(Number)
  const comme_utc = Date.UTC(y, mo - 1, j, hh, mm)
  // Décalage de Paris à cet instant ; second passage pour les changements d'heure
  let t = comme_utc
  for (let i = 0; i < 2; i++) {
    const vu = isoVersParis(new Date(t).toISOString()).split(/[-T:]/).map(Number)
    t -= Date.UTC(vu[0], vu[1] - 1, vu[2], vu[3], vu[4]) - comme_utc
  }
  return new Date(t).toISOString()
}

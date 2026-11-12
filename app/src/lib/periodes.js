// Période en cours : la première dont la fin n'est pas passée (null = jeu fermé).
// Affichage uniquement : c'est le serveur qui décide de la période d'un pari.
export function periodeCourante(periodes, now = new Date()) {
  const t = now.getTime()
  return [...periodes]
    .sort((a, b) => a.id - b.id)
    .find(p => new Date(p.ends_at).getTime() > t) ?? null
}

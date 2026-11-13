// Photos des candidats : d'abord la liste figée (data/photos.js), sinon une recherche sur Wikipédia
// pour les noms ajoutés à la main. On n'accepte une photo que si la page décrit une personne
// française ou politique (une ville, une homonymie, un objet… ne donnent pas de photo).
import { PHOTOS } from '../data/photos'

const norme = t => String(t ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const CONNUES = new Map(Object.entries(PHOTOS).map(([nom, url]) => [norme(nom), url]))
const CLE_CACHE = 'pari2027-photos'

export const photoConnue = nom => CONNUES.get(norme(nom)) ?? null

// Description Wikidata d'une page (« homme politique français ») : est-ce une personne qui peut être candidate ?
export function descriptionAcceptable(description) {
  const d = String(description ?? '').toLowerCase()
  if (!d || d.includes('homonymie')) return false
  return /français|française|politi|ministre|député|militant|syndical/.test(d)
}

let cache = null
function lireCache() {
  if (cache) return cache
  try { cache = JSON.parse(localStorage.getItem(CLE_CACHE) ?? '{}') } catch { cache = {} }
  return cache
}
function ecrireCache(nom, url) {
  lireCache()[norme(nom)] = url
  try { localStorage.setItem(CLE_CACHE, JSON.stringify(cache)) } catch { /* stockage indisponible */ }
}

const enCours = new Map()

// Photo d'un nom saisi à la main : URL, ou null (déjà cherché sans succès, ou rien de fiable).
export function chercherPhoto(nom) {
  const cle = norme(nom)
  if (!cle) return Promise.resolve(null)
  const c = lireCache()
  if (cle in c) return Promise.resolve(c[cle])
  if (enCours.has(cle)) return enCours.get(cle)
  const params = new URLSearchParams({
    action: 'query', format: 'json', origin: '*', redirects: '1',
    prop: 'pageimages|description', piprop: 'thumbnail', pithumbsize: '160', titles: nom.trim(),
  })
  const p = fetch(`https://fr.wikipedia.org/w/api.php?${params}`)
    .then(r => r.json())
    .then(d => {
      const page = Object.values(d?.query?.pages ?? {})[0]
      const url = page?.thumbnail?.source && descriptionAcceptable(page.description) ? page.thumbnail.source : null
      ecrireCache(nom, url)
      return url
    })
    .catch(() => null) // hors ligne : on réessaiera plus tard
    .finally(() => enCours.delete(cle))
  enCours.set(cle, p)
  return p
}

// Déjà connue sans réseau ? (liste figée ou cache) ; undefined = à chercher.
export function photoImmediate(nom) {
  const connue = photoConnue(nom)
  if (connue) return connue
  const c = lireCache()
  return norme(nom) in c ? c[norme(nom)] : undefined
}

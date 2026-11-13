import { useEffect, useState } from 'react'
import { photoImmediate, chercherPhoto } from '../lib/photos'
import Avatar from './Avatar'

// Avatar d'un candidat : sa photo (liste figée ou trouvée sur Wikipédia), sinon ses initiales.
export default function Visage({ nom, taille = 24, className }) {
  const immediate = photoImmediate(nom)
  const [trouvee, setTrouvee] = useState({ nom: null, url: null })
  useEffect(() => {
    if (immediate !== undefined) return
    let actif = true
    chercherPhoto(nom).then(url => { if (actif) setTrouvee({ nom, url }) })
    return () => { actif = false }
  }, [nom, immediate])
  const photo = immediate !== undefined ? immediate : trouvee.nom === nom ? trouvee.url : null
  return <Avatar nom={nom} taille={taille} photo={photo} lettres={2} className={className} />
}

import s from './Carte.module.css'

// Carte : bordure d'un pixel, rayon 12. `surface` pour le fond gris clair (bannière),
// `liste` pour une liste groupée bord à bord (pas de marge intérieure).
export default function Carte({ element = 'section', surface = false, liste = false, className = '', children, ...props }) {
  const Tag = element
  const classes = [s.carte, surface && s.surface, liste ? s.liste : s.rembourree, className].filter(Boolean).join(' ')
  return <Tag className={classes} {...props}>{children}</Tag>
}

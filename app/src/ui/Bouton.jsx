import { Link } from 'react-router-dom'
import s from './Bouton.module.css'

// Bouton : « principal » (une seule action principale par écran), « secondaire » ou « discret ».
// Avec `to`, rend un lien du routeur avec le même aspect.
export default function Bouton({ variante = 'principal', grand = false, pleineLargeur = false, to, className = '', children, ...props }) {
  const classes = [s.bouton, s[variante], grand && s.grand, pleineLargeur && s.pleineLargeur, className].filter(Boolean).join(' ')
  if (to) return <Link to={to} className={classes} {...props}>{children}</Link>
  return <button type="button" className={classes} {...props}>{children}</button>
}

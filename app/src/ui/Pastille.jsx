import s from './Pastille.module.css'

// Petite étiquette d'information (« Période 2 · J-150 »). `accent` pour le rouge discret.
export default function Pastille({ accent = false, className = '', children }) {
  return <span className={[s.pastille, accent && s.accent, className].filter(Boolean).join(' ')}>{children}</span>
}

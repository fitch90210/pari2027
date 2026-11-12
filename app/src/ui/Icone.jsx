// Icônes au trait (24 × 24), couleur héritée du texte.
const TRACES = {
  accueil: 'M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z',
  paris: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8 9h8M8 13h8M8 17h5',
  classements: 'M5 20v-8h4v8M10 20V6h4v14M15 20v-5h4v5',
  regles: 'M4 5.5c3-1.2 5.5-1 8 .8 2.5-1.8 5-2 8-.8V19c-3-1.2-5.5-1-8 .8-2.5-1.8-5-2-8-.8zM12 6.3v13.5',
  plus: 'M12 5v14M5 12h14',
  fermer: 'M6 6l12 12M18 6 6 18',
  chevron: 'm9 6 6 6-6 6',
  retour: 'm15 6-6 6 6 6',
  fleche: 'M5 12h14M13 6l6 6-6 6',
  coche: 'm5 12.5 4.5 4.5L19 7.5',
}

export default function Icone({ nom, taille = 22, epaisseur = 1.7, className }) {
  return (
    <svg
      className={className}
      width={taille} height={taille} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={epaisseur}
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false"
    >
      <path d={TRACES[nom]} />
    </svg>
  )
}

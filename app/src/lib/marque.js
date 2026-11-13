// Nom du site (choisi le 13/11/2026) et sous-titre, en un seul endroit.
export const NOM = 'Au doigt mouillé'
// Emblème à côté du nom : le doigt levé (« au doigt mouillé », on sent d'où vient le vent).
export const EMBLEME = '☝️'
export const SOUS_TITRE = 'Pronostics pour la présidentielle 2027'

// Titre de l'onglet du navigateur : « Pronostics · Au doigt mouillé », ou nom et sous-titre sur l'accueil.
export const titreOnglet = titre => (titre ? `${titre} · ${NOM}` : `${NOM} · ${SOUS_TITRE}`)

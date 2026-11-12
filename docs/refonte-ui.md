# Refonte UI — cadrage

*Novembre 2026 · statut : cadrage validé*

## Contexte

La refonte fonctionnelle (lots 0–7) est en prod : paris datés, modifiables 24 h, 4 périodes, un classement par période, mode démo. L'UI date d'avril 2026 et a été pensée pour des phases pilotées par l'admin : l'accueil est une page de règles statique, trois pages montrent des paris (Mes paris, Tous les paris, Classements), Admin est dans la nav publique, et rien ne dit aux joueurs qu'ils doivent reposer un pari en P2. Le code est fait de styles en ligne (pas de système de composants). Le site sert aussi de pièce de portfolio.

Objectif : nouvelle DA, nouvelle architecture, parcours repensés, **sans toucher à la base ni à la logique** (`GameContext`, `lib/`).

## Principe directeur

**Mobile first.** Chaque écran est conçu d'abord à 375 px, au pouce ; le desktop n'est qu'un élargissement. Le parcours qui prime sur tous les autres :

> **Arriver → comprendre → parier → voir tous les paris.**

Un nouveau venu arrivé par un lien doit, sans aide : comprendre le jeu en quelques secondes depuis l'accueil, poser un pari en quelques minutes, puis atterrir sur l'ensemble des paris du groupe pour se comparer.

## Référence d'interface : Apple Human Interface Guidelines

L'UI applique les bonnes pratiques des HIG d'Apple, transposées au web mobile :

- **Clarté, discrétion, profondeur** : le contenu prime, le chrome s'efface ; hiérarchie par la typo et l'espace plutôt que par des cadres.
- **Navigation** : barre d'onglets en bas, 5 entrées au plus, toujours visible au premier niveau ; grand titre (*large title*) qui se réduit au scroll ; retour en haut à gauche ; le geste retour du navigateur fonctionne partout.
- **Feuilles (*sheets*)** pour les tâches ponctuelles (identification, détail d'un pari, confirmation), glissables pour fermer.
- **Contrôles standards** : contrôle segmenté pour les vues, listes groupées (*inset grouped*), boutons pleine largeur pour l'action principale, une seule action principale par écran.
- **Cibles tactiles ≥ 44 × 44 pt**, zone du pouce pour les actions fréquentes, respect des *safe areas* (`env(safe-area-inset-*)`).
- **Typographie** : pile système (`-apple-system`, SF Pro), échelle proche des styles iOS (Large Title, Title, Headline, Body, Footnote), tailles relatives pour respecter le zoom du texte.
- **Couleurs sémantiques** (fond, fond groupé, label, label secondaire, séparateur, teinte d'accent) déclinées clair/sombre ; contraste AA minimum.
- **Mouvement** : animations courtes, physiques, qui expliquent un changement d'état ; `prefers-reduced-motion` respecté.
- **Retour d'état** : chaque action donne un retour immédiat ; états vides, chargement et erreur rédigés.

## Décisions (ping-pong du 12/11)

| # | Sujet | Décision |
|---|---|---|
| 1 | Direction visuelle | Nouvelle DA complète |
| 2 | Public | Les joueurs d'abord, qui viennent aussi consulter paris, classements, principe |
| 3 | Accueil | Vitrine **courte** + état du jeu visible sans scroll sur mobile |
| 4 | Paris | Une vue **Tous les paris** agrégée par pronostic et par candidat (qui a mis qui, à combien), les joueurs en info secondaire ; profils joueurs pour l'historique ; « Mes paris » disparaît ; « Parier » = action |
| 5 | Ambiance | Minimal épuré type app moderne + avatars, tutoiement, micro-animations soignées |
| 6 | Identité | Seulement au moment de parier ; site anonyme. Code gardé en mémoire sur l'appareil (comme aujourd'hui) |
| 7 | Parier | Étapes (1 pronostic/écran sur mobile) + récap avant validation |
| 8 | Fil | Fil simple : qui a parié, quand → profil |
| 9 | Thème | Clair par défaut + sombre auto |
| 10 | Méthode | 2–3 maquettes HTML jetables pour choisir la DA, puis code |
| 11 | CSS | CSS Modules + variables CSS, zéro style en ligne, aucune dépendance |
| 12 | Admin | Repensée, hors nav |
| 13 | Avatars | Initiales colorées (couleur dérivée du nom), aucune modif de base |
| 14 | Classement | **Un classement général de paris** (règle révisée, voir `refonte-fonctionnelle.md`) : podium + liste ; chaque ligne = un pari (avatar, nom, date), score du barème + bonus d'anticipation, détail dépliable |
| 15 | Après le 2nd tour | Mode « résultats » : accueil = podium final + résultats réels, CTA « Et si tu avais parié ? » |
| 17 | Règle | Bonus d'anticipation +1 pt par mois d'avance, classement général de paris, pas de limite de paris (faille assumée). Lot R avant le lot A |
| 16 | Livraison | Une branche, testée sur l'URL de preview (base de test), une seule bascule en prod |

## Architecture

| Route | Contenu |
|---|---|
| `/` | Accroche 1 phrase + CTA Parier · **« Comment ça marche » en 3 temps** (tu paries sur 5 pronostics, autant de fois que tu veux · chaque pari est scoré indépendamment, et plus tu paries tôt, plus il rapporte · tous les paris sont visibles) · carte « bonus d'anticipation » (ex. « parie aujourd'hui : +4 pts d'avance, +3 seulement dès le 11 décembre ») · podium du classement général (une fois les résultats connus) · période en cours, seulement quand elle ferme des pronostics · fil des derniers paris · lien Règles. Après le 2nd tour : mode résultats |
| `/parier` | Parcours en étapes (voir ci-dessous) |
| `/parier/:pariId` | Correction d'un pari < 24 h (même parcours, ouvert sur le récap) |
| `/classements` | Classement général des paris : podium + liste, chaque ligne = un pari (avatar, nom, date, barème + bonus). Avant les résultats : explication du bonus et des paris déjà posés avec leur bonus acquis |
| `/paris` | **Tous les paris**, centrés sur **les pronostics, pas sur les joueurs** (voir ci-dessous). Destination naturelle après avoir parié |
| `/joueurs/:id` | Paris du joueur en frise (chaque pari daté, bonus acquis, rang au classement, dépliable) · « Corriger » si < 24 h · « Nouveau pari à partir de celui-ci » |
| `/regles` | Concept, 5 pronostics et barème, bonus d'anticipation, ce que ferment les périodes, départage |
| `/demo` | Démo « à rebours » (visible une fois les résultats saisis) |
| `/admin` | Hors nav, lien discret en pied de page |
| Anciennes routes | `/pronostics` → `/paris`, `/pronostics/:id` → `/joueurs/:id`, `/voir` → `/paris` (les liens partagés dans le groupe doivent continuer à marcher) |

**Navigation** : mobile = barre d'onglets en bas, au pouce : Accueil · Paris · **Parier** (bouton central proéminent) · Classements · Règles ; desktop = barre haute équivalente. Pastille de période lisible (« Période 2 · J-123 »).

### Tous les paris (`/paris`)

Deux lectures, au choix par un contrôle segmenté en haut : **Tendances** · **Pari par pari**.

**Pari par pari** : tous les paris posés, du plus récent au plus ancien, y compris les anciens paris d'un même joueur ; filtre par période. Chaque ligne : date, avatar et nom (discrets), aperçu (vainqueur, finalistes). Tap → le pari complet (5 pronostics), sans moyenne ni écart.

**Tendances** : la question est « qui a mis qui, et à combien ? », pas « qu'a parié Paul ? ». La vue agrège le **dernier pari de chaque joueur** (l'avis actuel du groupe), **par candidat** ; les joueurs sont une info secondaire (petits avatars).

- **Second contrôle segmenté** : 1er tour · 2nd tour.
- **1er tour** : une ligne par candidat (photo, nom), triée par popularité : « 9 joueurs sur 11 l'ont mis », score moyen, fourchette min–max, et une mini-échelle où chaque pari est un point. Tap → la ligne se déplie : chaque joueur, avec son avatar et son %. En tête, un rappel : nombre de candidats prévu (médiane, fourchette).
- **2nd tour** : les duels de finalistes les plus pariés (« Bardella – Philippe : 6 joueurs »), puis le vainqueur (répartition, avatars), puis le score du vainqueur (moyenne, fourchette, points par joueur).
- **Le pari complet d'un joueur** reste accessible : un tap sur un avatar mène à son profil `/joueurs/:id`.
- **Après avoir parié**, l'utilisateur arrive ici, et ses propres choix sont mis en valeur dans chaque ligne (« toi : 24 % »).

## Parcours clés

1. **Nouveau venu (parcours prioritaire)** : lien → accueil, il comprend en 3 temps → Parier → « Qui es-tu ? » → « Je suis nouveau » (nom + code) → étapes vides → récap → confirmation → **Tous les paris**, son pari en tête, mis en valeur.
2. **Joueur qui revient** : lien → accueil, carte du bonus (« parie avant le 11 décembre pour +4 ») → Parier → « Qui es-tu ? » (si pas déjà mémorisé) → étapes pré-remplies avec son dernier pari → récap → confirmation « modifiable jusqu'à demain 14 h » → Tous les paris.
3. **Curieux** : Paris ou Classements → joueur → profil et historique ; ou accueil → fil → profil.
4. **Correction < 24 h** : profil → « Corriger » → code si besoin → récap éditable.
5. **Après l'élection** : accueil mode résultats → « Et si tu avais parié ? » → démo → score.
6. **Admin** : pied de page → mot de passe → onglets :
   - **Calendrier** : bornes des périodes, dates du scrutin ;
   - **Scrutin** : checklist chronologique (liste officielle → résultats 1er tour → résultats 2nd tour), aperçu du classement avant d'enregistrer ;
   - **Joueurs** : créer, réinitialiser un code, retirer (avec confirmation).

**Parcours Parier en détail** : identification → (période ≥ 3 : pronostics fermés masqués, liste officielle imposée) → 1 écran par pronostic ouvert, barre de progression, retour arrière libre, jauge « 100 % » vivante pour les scores du 1er tour → récap (tout modifiable d'un tap) → validation → écran de confirmation animé.

## Lots

Tout sur la branche `refonte-ui` ; chaque push donne une URL de preview branchée sur la base de test.

- **R. Règle** (avant A) : dans `lib/scoring.js`, `bonusAnticipation(pari, periodes)` (mois entiers entre `created_at` et la fin de la période 3) et `classementGeneral(paris, periodes, results)` (un pari par ligne, barème de sa période + bonus, départage inchangé) ; tests Vitest ; `classementPeriode` retiré une fois l'UI basculée.

- **A. Pistes de DA** : 2–3 maquettes HTML statiques, à 375 px (accueil + une étape de pari + Tous les paris 1er tour, clair et sombre), publiées en Artifact pour choisir. Livrable : tokens retenus (couleurs, typo, rayons, ombres, mouvements).
- **B. Fondations** : tokens CSS clair/sombre, reset, composants de base en CSS Modules (`Button`, `Card`, `Avatar` initiales, `CandidateAvatar` restylé, `Badge`, `Tabs`, `Sheet`/modale, `Countdown`, `Stepper`, `EmptyState`), layout + nav (onglets bas / barre haute), nouvelles routes + redirections. Suppression de `index.css` au fil des lots.
- **C. Accueil + Règles**.
- **D. Parcours Parier** : réutilise la logique de `components/PronosticInputs.jsx` (`CandidateCombobox`, `M1Input`…), `lib/pari.js` (`VIDE`, `formDepuis`), l'identification de `pages/Pronostics.jsx` (`PlayerSelector`, `CodeGate`) restylée en étape.
- **E. Tous les paris + profils + Classements + fil** : réutilise `lib/scoring.js` et la logique de `components/PariScoreDetail.jsx`, `PronosticsReadView.jsx`.
- **F. Démo + mode résultats** : réutilise `pages/Demo.jsx`, `resultatsComplets` (`lib/pari.js`).
- **G. Admin** : réécriture de `pages/Admin.jsx` en 3 onglets, mêmes fonctions de `GameContext`.
- **H. Finition et bascule** : micro-animations (respect de `prefers-reduced-motion`), accessibilité (contrastes AA dans les 2 thèmes, focus, labels), états vides/erreur/chargement, merge sur `main`. Puis lot 8 (message au groupe) et suppression des variables Preview + base de test.

**Inchangé** : `store/GameContext.jsx`, `lib/*`, `data/*`, base Supabase, fonctions SQL. Aucune migration.

## Vérification

- `npm --prefix app test` (barème inchangé, nouveaux tests du bonus et du classement général), `npm --prefix app run build`, lint sans nouvelle erreur.
- Chaque lot : dev local (port 5174, `.claude/launch.json`) puis URL de preview Vercel (base de test, codes dans `secrets/codes_test.txt`) : parcours 1 à 6 joués de bout en bout, en mobile (375 px) et desktop, en clair et sombre.
- Avant bascule : vérifier les redirections des anciennes routes, le mode résultats (simulé sur la base de test), et qu'aucun écran ne contient de style en ligne.
- Après bascule : contrôle en prod en lecture seule (aucun pari créé), les 10 paris de P1 visibles et identiques.

# Refonte fonctionnelle — cadrage

*Novembre 2026 · statut : décisions principales prises, 3 questions ouvertes*

## Objectif

Un joueur peut **poser ou mettre à jour un pari quand il veut**, sans attendre que l'admin ouvre une phase. Les phases disparaissent.

## Ce qui existe aujourd'hui

- **3 phases** pilotées par l'admin. Chaque phase a une ligne de pronostic par joueur (`pronostics.session` = 1, 2 ou 3).
- **Changer de phase gèle** les pronostics de la précédente (`locked_at`).
- **Scoring** : chaque phase est scorée séparément, le classement fait la somme. En phase 2, la liste des candidats est imposée et le pronostic 1 ne rapporte rien. La phase 3 ne porte que sur le score du 2nd tour.
- **Données réelles** : 11 joueurs, 10 pronostics de phase 1 (avril–mai 2026), dont 9 gelés le 3 mai 2026.

> Le code a déjà divergé des specs d'origine : les specs prévoyaient deux classements (« Visionnaire » et « Stratège »), l'app n'en a qu'un, qui additionne les phases.

## Le problème de fond : l'avantage du dernier moment

Les phases servaient à une chose : **récompenser ceux qui parient tôt**. Sans elles, un pari posé la veille du scrutin, sondages en main, écrase un pari posé un an avant. La refonte doit donc remplacer les phases par un autre mécanisme qui valorise l'anticipation.

## Décisions

| Sujet | Décision |
|---|---|
| Unité de jeu | Le **pari** : les 5 pronostics d'un bloc, avec une seule date. |
| Fréquence | **Sans limite** : un joueur pose un nouveau pari quand il veut. |
| Modification | Un pari est **modifiable 24 h** après sa création (pour corriger une erreur), puis figé. Pour changer d'avis ensuite, on pose un nouveau pari, pré-rempli avec le précédent. |
| Scoring | Chaque pari est **scoré indépendamment**, avec le barème actuel, **sans pondération** selon sa date. |
| Classement | **Un classement par période**. Dans chaque période, c'est le **dernier pari** de chaque joueur posé dans la période qui compte. |
| Visibilité | Les paris de tous les joueurs restent **visibles en permanence**. |
| Après l'élection | Classements figés, plus un **mode démo** : un visiteur peut parier « à rebours » pour voir son score, sans entrer au classement. |

L'anticipation est donc valorisée par les **périodes**, plus par un multiplicateur : un pari posé un an avant concourt contre les autres paris posés un an avant. Comme seul le dernier pari d'une période compte, multiplier les paris ne donne aucun avantage.

## Périodes *(proposition)*

Les périodes reprennent le sens des anciennes phases, mais on peut parier à tout moment. Leurs bornes sont des dates saisies par l'admin.

| Période | Du… | …au | Pronostics scorés |
|---|---|---|---|
| 1. Un an avant | Ouverture du jeu | 31 août 2026 | Les 5 |
| 2. La pré-campagne | 1er septembre 2026 | Publication de la liste officielle (~mars 2027) | Les 5 |
| 3. La campagne | Liste officielle | Veille du 1er tour | 2 à 5 (la liste des candidats est connue) |
| 4. L'entre-deux-tours | Lendemain du 1er tour | Veille du 2nd tour | 4 et 5 (les finalistes sont connus) |

Un pari ne contient que les pronostics encore ouverts au moment où il est posé. À partir de la période 3, la saisie des scores ne propose que les candidats officiels.

## Clôtures

Le jeu ferme la veille du 2nd tour. Les pronostics 1 à 3 ne sont plus saisissables une fois le résultat qu'ils prédisent connu (voir colonne ci-dessus).

## Historique

Les paris ne sont jamais écrasés : chaque nouveau pari s'ajoute. On garde ainsi l'historique de chaque joueur, ce qui permet :
- d'afficher l'évolution de ses pronostics (« Paul a lâché Bardella en janvier ») ;
- de recalculer les classements avec n'importe quelle règle ;
- de ne jamais perdre de données.

## Reprise des données existantes

- Les 10 pronostics de phase 1 deviennent des **paris**, datés de leur dernière modification (`updated_at`, entre le 23 avril et le 16 mai 2026). Ils tombent tous dans la période 1.
- Ils sont figés : leur fenêtre de modification de 24 h est passée depuis longtemps. Le gel actuel disparaît en tant que notion.
- L'ancienne table reste en place, en lecture seule, le temps de valider la migration.

## Ce qui change dans l'app

- **Mes paris** : la liste de mes paris datés, et un bouton « Nouveau pari » toujours disponible, pré-rempli avec le dernier. Un pari de moins de 24 h reste modifiable.
- **Tous les paris** : le dernier pari de chaque joueur, avec accès à son historique.
- **Classements** : un onglet par période, avec le détail des points par pronostic.
- **Admin** : plus de boutons de phase. À la place : bornes des périodes, dates du scrutin, liste officielle, résultats.
- **Accueil** : nouvelles règles du jeu.
- **Mode démo**, une fois les résultats saisis.

## Questions ouvertes

1. Les bornes des périodes proposées ci-dessus conviennent-elles ?
2. Faut-il aussi un classement général (par exemple la somme des scores des quatre périodes) ou seulement les classements par période ?
3. Un joueur qui n'a pas parié dans une période est-il absent de ce classement, ou y figure-t-il avec son dernier pari antérieur ?

## Hors périmètre

- **Refonte UI** : prévue juste après cette refonte fonctionnelle.
- Comptes utilisateurs, notifications, temps réel.

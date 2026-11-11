# Refonte fonctionnelle — plan technique

*Novembre 2026 · à partir du [cadrage validé](refonte-fonctionnelle.md)*

## Principes

- **Aucune perte de données.** La migration ajoute de nouvelles tables sans toucher aux anciennes. La table `pronostics` reste en place, en lecture seule, comme archive.
- **Le serveur fait foi.** La date d'un pari, sa période, la fenêtre de modification de 24 h et les pronostics encore ouverts sont décidés par la base, jamais par le navigateur.
- **Le scoring reste côté client**, dans `scoring.js`, comme aujourd'hui : les résultats et les paris sont publics, il n'y a rien à protéger.
- **Pas de mise en production à l'aveugle.** Chaque push sur `main` déploie en production, donc la refonte se fait sur une branche, testée sur une base de test.

## Modèle de données

### `public.periodes` (nouvelle)

| Colonne | Type | Rôle |
|---|---|---|
| `id` | int (1 à 4) | Numéro de période |
| `label` | text | « Un an avant », « La pré-campagne »… |
| `ends_at` | timestamptz | Fin de la période. Le début est la fin de la précédente. |
| `scored` | jsonb | Pronostics ouverts et scorés, ex. `["m2","m3","m4","m5"]` |

Les bornes sont saisies par l'admin, en heure de Paris. Le jeu est fermé après la fin de la période 4.

### `public.paris` (nouvelle)

| Colonne | Type | Rôle |
|---|---|---|
| `id` | bigserial | |
| `player_id` | text → `players` | |
| `periode` | int → `periodes` | **Fixée par le serveur à la création**, d'après la date |
| `m1` … `m5` | comme aujourd'hui | Les pronostics fermés dans la période sont laissés vides |
| `created_at` | timestamptz | Date du pari (celle qui compte) |
| `updated_at` | timestamptz | Dernière modification dans la fenêtre de 24 h |
| `legacy_pronostic_id` | bigint, nullable | Lien vers la ligne `pronostics` d'origine, pour les paris migrés |

Lecture publique, aucune écriture directe (RLS), comme les autres tables.

> On stocke la période au lieu de la recalculer : si l'admin déplace une borne plus tard, les paris déjà posés ne changent pas de classement.

### Inchangé

`players`, `private.player_secrets`, `private.admin_secret`, et `game_state` pour les résultats et la liste officielle. La colonne `game_state.session` ne sert plus.

## Fonctions SQL

| Fonction | Qui | Ce qu'elle vérifie |
|---|---|---|
| `create_pari(player_id, code, m1…m5)` | joueur | Code ; jeu ouvert ; détermine la période ; vide les pronostics fermés ; à partir de la période 3, n'accepte que des candidats officiels ; tailles et formats |
| `update_pari(pari_id, code, m1…m5)` | joueur | Code et propriétaire ; moins de 24 h ; **et la période du pari est toujours en cours** (sinon on pourrait corriger un pari après le 1er tour) |
| `admin_save_periodes(pin, periodes)` | admin | Mot de passe ; dates croissantes |
| `admin_save_results`, `admin_save_official_candidates` | admin | Inchangées |

Supprimées à la bascule : `save_pronostic` et `admin_set_session`.

## Reprise des données

Dans la migration, en une requête :

- Chaque ligne `pronostics` de session 1 devient un pari de **période 1**.
- `created_at` et `updated_at` reprennent son `updated_at` (23 avril – 16 mai 2026) : ces paris sont donc figés d'office.
- `legacy_pronostic_id` garde le lien vers l'original.
- La migration se termine par un contrôle : 10 paris migrés, contenus identiques à l'original.

La migration est rejouable sans créer de doublons.

## Scoring et classements (`scoring.js`)

- `scorePari(pari, results, periode)` : applique le barème actuel aux seuls pronostics de `periode.scored`. Pour le pronostic 2, la liste de référence est celle du pari en périodes 1–2 et la liste officielle à partir de la période 3.
- `classementPeriode(paris, periode, results)` : le dernier pari de chaque joueur dans la période, trié par score. Départage : pronostic 2, puis le pari le plus ancien.
- **Tests unitaires** avec Vitest sur le barème et les classements. C'est le cœur du jeu, et il n'a aujourd'hui aucun test.

## Frontend

| Fichier | Changement |
|---|---|
| `store/GameContext.jsx` | Charge `paris` et `periodes`, calcule la période en cours ; `createPari`, `updatePari`, `savePeriodes` ; retire la notion de session |
| `pages/Pronostics.jsx` → **Mes paris** | Liste datée de mes paris ; « Nouveau pari » pré-rempli avec le dernier ; modification si moins de 24 h et période en cours ; seuls les pronostics ouverts sont affichés. Réutilise les champs de saisie actuels. |
| `pages/Voir.jsx` + `PronosticsReadView` → **Tous les paris** | Dernier pari de chaque joueur, historique dépliable |
| `pages/Classements.jsx` | Un onglet par période |
| `pages/Admin.jsx` | Bornes des périodes à la place des boutons de phase |
| `pages/Home.jsx`, `components/Nav.jsx` | Nouvelles règles ; période en cours au lieu de « P1 » |
| **Mode démo** (nouvelle page) | Une fois les résultats saisis : un visiteur remplit un pari et voit son score, calculé dans son navigateur. **Rien n'est enregistré en base**, donc pas de spam possible. |

## Environnement de test

Une **seconde base Supabase « test »** (le plan gratuit en permet deux) :
- même schéma et mêmes migrations que la production, plus une copie des données sauvegardées ;
- branchée sur les **déploiements de preview** de Vercel (variables d'environnement « Preview ») : chaque push sur la branche de refonte donne une URL de test qui n'écrit jamais dans la vraie base.

**Durée de vie :** à garder jusqu'à la fin de la refonte UI, puis à supprimer (le plan gratuit limite à deux projets actifs). Elle peut se mettre en pause entre-temps, ce n'est pas grave : on la relance d'un clic. À sa suppression, retirer aussi les variables « Preview » dans Vercel.

## Découpage en lots

| Lot | Contenu | Livrable |
|---|---|---|
| 0 | Base de test + variables Preview Vercel + branche `refonte-paris` | URL de preview branchée sur la base de test |
| 1 | Migration SQL v4 : tables, fonctions, reprise des données | Migration jouée et contrôlée sur la base de test |
| 2 | `scoring.js` par période + tests Vitest | Tests verts |
| 3 | `GameContext` + **Mes paris** | Créer, pré-remplir et modifier un pari en preview |
| 4 | **Tous les paris** + **Classements** par période | |
| 5 | **Admin** + **Accueil** + navigation | Plus aucune référence aux phases |
| 6 | **Mode démo** | |
| 7 | Bascule : sauvegarde, migration v4 en production, merge sur `main`, nettoyage des anciennes fonctions | Production sur le nouveau modèle |
| 8 | Message au groupe : nouveau fonctionnement, période en cours | |

Les lots 2 et 3 à 6 peuvent avancer en parallèle une fois le lot 1 fait. La refonte UI vient après le lot 8.

## Risques

| Risque | Parade |
|---|---|
| Perte ou altération des paris existants | Sauvegarde avant bascule ; migration additive ; contrôle automatique en fin de migration ; ancienne table conservée |
| Les tests écrivent dans la vraie base | Base de test dédiée pour les previews |
| Un pari corrigé après un résultat connu | `update_pari` refuse dès que la période du pari est close |
| Fuseau horaire des bornes | Dates saisies et affichées en heure de Paris, stockées en UTC |
| Dates du scrutin 2027 pas encore officielles | Bornes modifiables par l'admin à tout moment |

## Prérequis de ton côté

- Créer le projet Supabase de test (lot 0), puis me donner son URL et sa clé `anon`. Je n'ai besoin d'aucune clé d'administration.

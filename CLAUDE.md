# Pari 2027 — guide de reprise

Jeu de pronostics entre amis pour la présidentielle 2027. Présentation complète : [README.md](README.md).

## Règle absolue

**Les paris enregistrés en base sont de vraies données, irremplaçables.** Jamais de `DELETE`, `TRUNCATE`, reset ou migration destructive sur la base de production. Avant toute migration : sauvegarde JSON des tables (voir « Sauvegarde » ci-dessous), migration additive, contrôle après coup.

## État au 12 novembre 2026

- **En ligne** : https://pari2027.vercel.app, **refonte fonctionnelle déployée** (lots 0 à 7 : parier à tout moment, sans phases). Migration v4 jouée en production et contrôlée : les 10 pronostics de phase 1 sont devenus 10 paris de période 1, identiques aux originaux.
- **Données** : 11 joueurs, 10 paris (avril–mai 2026), tous en période 1. La table `pronostics` est conservée en archive. Sauvegardes dans `backups/` (dernière : `backups/2026-11-12_1108/`, faite juste avant la migration).
- **Périodes** : bornes provisoires (fin P1 : 1er sept. 2026, P2 : 15 mars 2027, P3 : 11 avril 2027, P4 : 25 avril 2027), modifiables dans l'admin. La période en cours est la 2.
- **Reste à faire** : (migration v5 jouée en prod le 12/11 : `save_pronostic` et `admin_set_session` n'existent plus) supprimer les variables Vercel « Preview » et la base de test *à la fin de la refonte UI*, prévenir le groupe (lot 8) — à la bascule de la refonte UI, car la règle change : bonus d'anticipation et classement général de paris (révision du 12/11 dans `docs/refonte-fonctionnelle.md`).
- **Ensuite** : la refonte UI, **cadrée le 12/11** ([docs/refonte-ui.md](docs/refonte-ui.md), lots A à H, branche `refonte-ui`). Lot R fait sur la branche `refonte-ui` (non commité) : `bonusAnticipation` et `classementGeneral` dans `scoring.js`, 33 tests verts ; `classementPeriode` reste utilisé par Classements et Demo jusqu'à l'UI. Lots A et B faits le 12/11 sur la branche `refonte-ui` : direction « B Scrutin épuré » (Geist, tokens dans `app/src/styles/tokens.css`), composants de base dans `app/src/ui/`, coque et barre d'onglets dans `app/src/layout/`, routes et redirections dans `App.jsx` (page interne `/ui` = nuancier). L'ancien CSS reste, ses variables sont préfixées `--v1-` (retiré au lot H). Maquettes : https://claude.ai/artifact/FCHDF4hEs3pZLVwpLjnYeq. Lot C fait : accueil (`pages/Accueil.jsx`) et règles (`pages/Regles.jsx`), lien Admin discret en pied de page (`ui/Pied.jsx`). Lot D (parcours Parier, `pages/parier/`) et lot E (Paris : Tendances et Pari par pari, `pages/paris/` ; profils `pages/Profil.jsx` ; classement général `pages/Classement.jsx`) écrits. Lot E vérifié à l'écran sur les vraies données (lecture seule) ; le parcours Parier reste à tester sur la preview (base de test). Logique : `lib/tendances.js`, `lib/detailPari.js`, `lib/parcours.js`. Les anciennes règles CSS globales (titres, liens) sont limitées à `.page`. Lot F écrit : démo (`pages/Demo.jsx`, `lib/demo.js`) qui réutilise le parcours Parier (`demo` en prop de `Parcours`), mode résultats déjà sur l'accueil ; le flux démo n'est pas vu à l'écran (aucun résultat saisi sur les bases), à tester sur la preview après saisie de résultats de test. Anciens formulaires supprimés. Lot G écrit : admin en 3 onglets (`pages/admin/` : Calendrier, Scrutin, Joueurs), logique dans `lib/scrutin.js` ; seul l'écran de connexion est vu à l'écran (mot de passe admin non saisi), les onglets sont à tester sur la preview (base de test). Suppression d'un joueur : feuille de confirmation avec saisie du nom. Lot H fait : finitions et accessibilité, ancien CSS supprimé. Prochaine étape : tester sur la preview, puis bascule (voir « État et bascule » dans `docs/refonte-ui.md`) : merger `refonte-ui` dans `main` seulement sur accord explicite de l'utilisateur.

## Documents

| Fichier | Contenu |
|---|---|
| [docs/refonte-fonctionnelle.md](docs/refonte-fonctionnelle.md) | Cadrage validé : paris datés, modifiables 24 h, classements par période, mode démo |
| [docs/refonte-plan-technique.md](docs/refonte-plan-technique.md) | Modèle de données, fonctions SQL, lots 0 à 8, risques |
| [docs/refonte-ui.md](docs/refonte-ui.md) | Cadrage validé de la refonte UI : décisions, arborescence, parcours, lots A à H |
| [specs_pari2027.docx](specs_pari2027.docx) | Specs d'origine (avril 2026). Le code a divergé : un seul classement qui additionne les phases, pas deux. |
| `supabase_schema.sql`, `supabase_migration_v2.sql`, `supabase_migration_v3_securite.sql`, `supabase_migration_v4_paris.sql`, `supabase_migration_v5_nettoyage.sql` | Schéma et migrations, à jouer dans cet ordre. `supabase_test_v4.sql` : tests SQL de la v4, à jouer sur la base de test seulement (tout est annulé en fin de script). |

## Architecture

- **Frontend** : React 19 + Vite dans `app/`. Tout l'accès aux données passe par [app/src/store/GameContext.jsx](app/src/store/GameContext.jsx). Barème et classements par période dans [app/src/lib/scoring.js](app/src/lib/scoring.js) (tests Vitest : `npm --prefix app test`).
- **Base** : Supabase. Le public n'a que la **lecture** sur `game_state`, `players`, `periodes`, `paris` (et `pronostics`, archive). Toute écriture passe par des fonctions SQL `SECURITY DEFINER` (migration v3) :
  - joueurs : `create_player`, `verify_player_code`, `create_pari`, `update_pari` (code à 4 chiffres, 5 échecs = blocage 15 min ; la période d'un pari est fixée par le serveur, un pari n'est modifiable que 24 h et tant que sa période est en cours) ;
  - admin : `admin_login`, `admin_save_periodes`, `admin_save_results`, `admin_save_official_candidates`, `admin_create_player`, `admin_reset_player_code`, `admin_remove_player`.
  - Secrets hachés (bcrypt) dans le schéma `private`, non exposé par l'API.
- **Hébergement** : Vercel, projet `pari2027`, relié au dépôt GitHub `fitch90210/pari2027` (public), **Root Directory = `app`**. Un push sur `main` déploie en production.
- **Keepalive** : [app/api/keepalive.js](app/api/keepalive.js) + cron quotidien (8h UTC) dans `app/vercel.json`, pour que Supabase gratuit ne se mette pas en pause.

## Environnement de test

- **Base Supabase de test** : `https://yrgbugbasrilwxkqmhnm.supabase.co`, amorcée avec `secrets/test_bootstrap.local.sql` (schéma, migrations, copie de la sauvegarde du 11/11). Ses codes sont différents de ceux de la prod : `secrets/codes_test.txt`.
- **Vercel** : `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont définies pour **Preview** (base de test) et **Production** (vraie base). Tout push sur une autre branche que `main` donne une URL de preview branchée sur la base de test.
- À supprimer après la refonte UI : le projet Supabase de test et les variables Preview.

## Opérations

- **Lancer en local** : `npm --prefix app install` puis `npm --prefix app run dev` (config `.claude/launch.json`, port 5174). Nécessite `app/.env` (non versionné).
- **Déployer** : pousser sur `main`. Ne plus lancer `vercel --prod` depuis `app/` (le Root Directory ferait chercher `app/app`).
- **CLI Vercel** : `/Users/paulalbagli/.nvm/versions/node/v20.9.0/bin/vercel` (absente du PATH de la version de Node par défaut).
- **SQL** : Claude n'a que la clé `anon`. Toute migration se fait en collant le SQL dans Supabase > SQL Editor ; l'alerte « destructive operations » sur des `DROP POLICY`/`REVOKE` est normale, choisir « Run and enable RLS ».
- **Sauvegarde** : lire les 3 tables via l'API REST avec la clé `anon` et les écrire dans `backups/<date>/` (dernière : `backups/2026-11-11_2151/`).
- **Lint** : 4 erreurs préexistantes (`set-state-in-effect`, `only-export-components`), non bloquantes pour le build.

## Fichiers locaux non versionnés

- `secrets/codes.txt` : mot de passe admin et codes des 11 joueurs. **Ne jamais les recopier ailleurs ni les afficher.**
- `secrets/codes_initiaux.local.sql` : SQL qui a initialisé ces secrets.
- `backups/` : sauvegardes JSON des données réelles.
- `app/.env`, `app/.env.vercel*` : variables et tokens.

## Conventions

- Tout en français : interface, commits, documentation.
- Supabase gratuit : le projet de prod se met en pause après 7 jours sans activité (le keepalive l'évite). Si l'API ne répond plus, vérifier le dashboard avant toute autre hypothèse.

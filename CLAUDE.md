# Pari 2027 — guide de reprise

Jeu de pronostics entre amis pour la présidentielle 2027. Présentation complète : [README.md](README.md).

## Règle absolue

**Les paris enregistrés en base sont de vraies données, irremplaçables.** Jamais de `DELETE`, `TRUNCATE`, reset ou migration destructive sur la base de production. Avant toute migration : sauvegarde JSON des tables (voir « Sauvegarde » ci-dessous), migration additive, contrôle après coup.

## État au 11 novembre 2026

- **En ligne** : https://pari2027.vercel.app, version sécurisée, phase 1 active.
- **Données** : 11 joueurs, 10 pronostics de phase 1 (avril–mai 2026). 9 sont **gelés volontairement** depuis le 3 mai 2026 (`locked_at`), seul celui de Willy ne l'est pas. Le site les affiche en lecture seule.
- **En cours** : la refonte fonctionnelle « parier à tout moment, sans phases », sur la branche `refonte-paris`. Lots 0 et 1 faits le 12 novembre 2026 : base de test, puis migration v4 (`supabase_migration_v4_paris.sql`, tests dans `supabase_test_v4.sql`) jouée et contrôlée sur la base de test uniquement, pas en prod. Lot 2 fait le même jour : `scorePari` et `classementPeriode` dans `scoring.js`, `periodeCourante` dans `lib/periodes.js`, 20 tests Vitest (`npm --prefix app test`). Lot 3 fait le même jour : `GameContext` charge `paris` et `periodes` (en plus de l'ancien modèle, retiré aux lots 5 et 7) et expose `createPari`/`updatePari` ; la page `/pronostics` est devenue « Mes paris » (champs de saisie dans `components/PronosticInputs.jsx`), testée en preview sur la base de test. Lot 4 fait le même jour : « Tous les paris » (dernier pari + historique) et classements par période (un onglet par période) ; l'ancien scoring par phases est retiré. Prochaine étape : **lot 5** (Admin, Accueil, navigation : plus aucune référence aux phases, puis retrait de `session`/`pronosticsMap` du `GameContext`).
- **Ensuite** : une refonte UI, prévue après la refonte fonctionnelle.

## Documents

| Fichier | Contenu |
|---|---|
| [docs/refonte-fonctionnelle.md](docs/refonte-fonctionnelle.md) | Cadrage validé : paris datés, modifiables 24 h, classements par période, mode démo |
| [docs/refonte-plan-technique.md](docs/refonte-plan-technique.md) | Modèle de données, fonctions SQL, lots 0 à 8, risques |
| [specs_pari2027.docx](specs_pari2027.docx) | Specs d'origine (avril 2026). Le code a divergé : un seul classement qui additionne les phases, pas deux. |
| `supabase_schema.sql`, `supabase_migration_v2.sql`, `supabase_migration_v3_securite.sql` | Schéma et migrations, à jouer dans cet ordre |

## Architecture

- **Frontend** : React 19 + Vite dans `app/`. Tout l'accès aux données passe par [app/src/store/GameContext.jsx](app/src/store/GameContext.jsx). Barème dans [app/src/lib/scoring.js](app/src/lib/scoring.js).
- **Base** : Supabase. Le public n'a que la **lecture** sur `game_state`, `players`, `pronostics`. Toute écriture passe par des fonctions SQL `SECURITY DEFINER` (migration v3) :
  - joueurs : `create_player`, `verify_player_code`, `save_pronostic` (code à 4 chiffres, 5 échecs = blocage 15 min) ;
  - admin : `admin_login`, `admin_set_session`, `admin_save_results`, `admin_save_official_candidates`, `admin_create_player`, `admin_reset_player_code`, `admin_remove_player`.
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
- **Lint** : 5 erreurs préexistantes (`set-state-in-effect`, `only-export-components`), non bloquantes pour le build.

## Fichiers locaux non versionnés

- `secrets/codes.txt` : mot de passe admin et codes des 11 joueurs. **Ne jamais les recopier ailleurs ni les afficher.**
- `secrets/codes_initiaux.local.sql` : SQL qui a initialisé ces secrets.
- `backups/` : sauvegardes JSON des données réelles.
- `app/.env`, `app/.env.vercel*` : variables et tokens.

## Conventions

- Tout en français : interface, commits, documentation.
- Supabase gratuit : le projet de prod se met en pause après 7 jours sans activité (le keepalive l'évite). Si l'API ne répond plus, vérifier le dashboard avant toute autre hypothèse.

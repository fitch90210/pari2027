# Au doigt mouillé (ex-Pari 2027) — guide de reprise

Jeu de pronostics entre amis pour la présidentielle 2027. Présentation complète : [README.md](README.md).

## Règle absolue

**Les paris enregistrés en base sont de vraies données, irremplaçables.** Jamais de `DELETE`, `TRUNCATE`, reset ou migration destructive sur la base de production. Avant toute migration : sauvegarde JSON des tables (voir « Sauvegarde » ci-dessous), migration additive, contrôle après coup.

## État au 13 novembre 2026

- **En ligne** : https://audoigtmouille.vercel.app (l'ancienne adresse https://pari2027.vercel.app répond toujours, sans redirection), version « Au doigt mouillé » (pivot pronostics), **bascule faite le 13/11** : sauvegarde `backups/2026-11-13_1342/`, migrations v6 et v7 (scores des gagnants corrigés dans `paris`) jouées en production, `refonte-ui` puis `correction-gagnants` fusionnées dans `main`, contrôle en lecture OK (10 pronostics, favori et moyenne identiques au calcul depuis la sauvegarde).
- **Produit** ([docs/pivot-pronostics.md](docs/pivot-pronostics.md)) : on poste un pronostic (les deux tours) avec un simple pseudo, sans compte ni code, et on voit ce que les autres pronostiquent. Plus de périodes, de score, de profils, de classement ni de démo. Admin réduite aux résultats (sans effet pour l'instant) et à la modération (masquer un pronostic). `refonte-fonctionnelle.md` est l'ancien cadrage.
- **Écrans** : accueil, `/pronostics` (1er/2nd tour : tendances puis liste), `/pronostics/:id`, `/pronostiquer` (3 étapes), `/admin` (Résultats, Modération). Logique dans `app/src/lib/` (`parcours.js`, `pronostic.js`, `tendances.js`, `photos.js`, `marque.js`). DA : « Scrutin épuré », titres en Newsreader, texte en Geist, emblème ☝️.
- **Nom** : « Au doigt mouillé », sous-titre « Pronostics pour la présidentielle 2027 » (défini dans `app/src/lib/marque.js`).
- **Reste à faire** : 1) prévenir le groupe (nouvelle adresse + ce qui change) ; 2) décider si `pari2027.vercel.app` redirige vers `audoigtmouille.vercel.app` (Settings → Domains → Edit → Redirect to) ; 3) plus tard, après sauvegarde : retirer les anciennes tables et fonctions (`players`, `periodes`, `pronostics`, `create_pari`, codes…), les variables Vercel « Preview » et la base de test ; 4) brique de scoring quand les candidats officiels seront connus.

## Documents

| Fichier | Contenu |
|---|---|
| [docs/pivot-pronostics.md](docs/pivot-pronostics.md) | **Produit actuel** (13/11) : pronostics avec pseudo, sans score ni période |
| [docs/refonte-fonctionnelle.md](docs/refonte-fonctionnelle.md) | Ancien cadrage (remplacé par le pivot) : paris datés, classements par période |
| [docs/refonte-plan-technique.md](docs/refonte-plan-technique.md) | Modèle de données, fonctions SQL, lots 0 à 8, risques |
| [docs/refonte-ui.md](docs/refonte-ui.md) | Cadrage validé de la refonte UI : décisions, arborescence, parcours, lots A à H |
| [specs_pari2027.docx](specs_pari2027.docx) | Specs d'origine (avril 2026). Le code a divergé : un seul classement qui additionne les phases, pas deux. |
| `supabase_schema.sql`, `supabase_migration_v2.sql`, `supabase_migration_v3_securite.sql`, `supabase_migration_v4_paris.sql`, `supabase_migration_v5_nettoyage.sql`, `supabase_migration_v6_pronostics.sql`, `supabase_migration_v7_scores_gagnants.sql` | Schéma et migrations, à jouer dans cet ordre. `supabase_test_v4.sql` : tests SQL de la v4, à jouer sur la base de test seulement (tout est annulé en fin de script). |

## Architecture

- **Frontend** : React 19 + Vite dans `app/`. Tout l'accès aux données passe par [app/src/store/GameContext.jsx](app/src/store/GameContext.jsx). Logique pure dans `app/src/lib/` (tests Vitest : `npm --prefix app test`).
- **Base** : Supabase. Le public n'a que la **lecture** sur `game_state`, `players`, `periodes`, `paris` (et `pronostics`, archive). Toute écriture passe par des fonctions SQL `SECURITY DEFINER` (migration v3) :
  - joueurs : `create_player`, `verify_player_code`, `create_pari`, `update_pari` (code à 4 chiffres, 5 échecs = blocage 15 min ; la période d'un pari est fixée par le serveur, un pari n'est modifiable que 24 h et tant que sa période est en cours) ;
  - admin : `admin_login`, `admin_save_periodes`, `admin_save_results`, `admin_save_official_candidates`, `admin_create_player`, `admin_reset_player_code`, `admin_remove_player`.
  - Secrets hachés (bcrypt) dans le schéma `private`, non exposé par l'API.
  - Après la v6 (pivot) : `create_pronostic` (public, pseudo, sans code, validé côté serveur, anti-rafale), `admin_set_masque`, `admin_paris_masques` ; seuls les pronostics non masqués sont lisibles. Les fonctions ci-dessus restent en place jusqu'au nettoyage.
- **Hébergement** : Vercel, projet `pari2027`, relié au dépôt GitHub `fitch90210/pari2027` (public), **Root Directory = `app`** (le projet Vercel s'appelle désormais `audoigtmouille` ; `app/.vercel/project.json` garde l'ancien nom `app`, sans conséquence : seul l'identifiant compte). Un push sur `main` déploie en production.
- **Keepalive** : [app/api/keepalive.js](app/api/keepalive.js) + cron quotidien (8h UTC) dans `app/vercel.json`, pour que Supabase gratuit ne se mette pas en pause.

## Environnement de test

- **Base Supabase de test** : `https://yrgbugbasrilwxkqmhnm.supabase.co`, amorcée avec `secrets/test_bootstrap.local.sql` (schéma, migrations, copie de la sauvegarde du 11/11). Ses codes sont différents de ceux de la prod : `secrets/codes_test.txt`.
- **Vercel** : `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont définies pour **Preview** (base de test) et **Production** (vraie base). Tout push sur une autre branche que `main` donne une URL de preview branchée sur la base de test.
- À supprimer une fois le nettoyage fait : le projet Supabase de test et les variables Preview.

## Opérations

- **Lancer en local** : `npm --prefix app install` puis `npm --prefix app run dev` (config `.claude/launch.json`, port 5174). Nécessite `app/.env` (non versionné).
- **Déployer** : pousser sur `main`. Ne plus lancer `vercel --prod` depuis `app/` (le Root Directory ferait chercher `app/app`).
- **CLI Vercel** : `/Users/paulalbagli/.nvm/versions/node/v20.9.0/bin/vercel` (absente du PATH de la version de Node par défaut).
- **SQL** : Claude n'a que la clé `anon`. Toute migration se fait en collant le SQL dans Supabase > SQL Editor ; l'alerte « destructive operations » sur des `DROP POLICY`/`REVOKE` est normale, choisir « Run and enable RLS ».
- **Sauvegarde** : lire les 3 tables via l'API REST avec la clé `anon` et les écrire dans `backups/<date>/` (dernière : `backups/2026-11-11_2151/`).
- **Lint** : 1 erreur préexistante (`only-export-components` dans `GameContext.jsx`), non bloquante.
- **Maquette locale** : config `pari2027-maquette` de `.claude/launch.json` (port 5175) + faux Supabase sur le port 54399 (script à recréer : sert `paris`/`game_state` depuis une sauvegarde, simule `create_pronostic` et l'admin).

## Fichiers locaux non versionnés

- `secrets/codes.txt` : mot de passe admin et codes des 11 joueurs. **Ne jamais les recopier ailleurs ni les afficher.**
- `secrets/codes_initiaux.local.sql` : SQL qui a initialisé ces secrets.
- `backups/` : sauvegardes JSON des données réelles.
- `app/.env`, `app/.env.vercel*` : variables et tokens.

## Conventions

- Tout en français : interface, commits, documentation.
- Supabase gratuit : le projet de prod se met en pause après 7 jours sans activité (le keepalive l'évite). Si l'API ne répond plus, vérifier le dashboard avant toute autre hypothèse.

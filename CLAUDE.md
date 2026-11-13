# Au doigt mouillé (ex-Pari 2027) — guide de reprise

Jeu de pronostics entre amis pour la présidentielle 2027. Présentation complète : [README.md](README.md).

## Règle absolue

**Les pronostics enregistrés en base (table `paris`) sont de vraies données, irremplaçables.** Jamais de `DELETE`, `TRUNCATE`, reset ou migration destructive sur la base de production sans demande explicite de l'utilisateur. Avant toute migration : sauvegarde JSON des tables (voir « Sauvegarde » ci-dessous), contrôle après coup (la v8 compare une empreinte de `paris` avant et après, et s'annule au moindre écart).

## État au 13 novembre 2026

- **En ligne** : https://audoigtmouille.vercel.app (l'ancienne adresse https://pari2027.vercel.app répond toujours, sans redirection), version « Au doigt mouillé » (pivot pronostics), **bascule faite le 13/11** : migrations v6 (pivot), v7 (scores des gagnants corrigés dans `paris`) et v8 (nettoyage de l'ancien modèle) jouées en production, `refonte-ui` puis `correction-gagnants` fusionnées dans `main`. Contrôles en lecture OK après chaque étape (10 pronostics, contenu identique à la sauvegarde `backups/2026-11-13_1400/`, faite juste avant la v8).
- **Produit** ([docs/pivot-pronostics.md](docs/pivot-pronostics.md)) : on poste un pronostic (les deux tours) avec un simple pseudo, sans compte ni code, et on voit ce que les autres pronostiquent. Plus de périodes, de score, de profils, de classement ni de démo. Admin réduite aux résultats (sans effet pour l'instant) et à la modération (masquer un pronostic). `refonte-fonctionnelle.md` est l'ancien cadrage.
- **Écrans** : accueil, `/pronostics` (1er/2nd tour : tendances puis liste), `/pronostics/:id`, `/pronostiquer` (3 étapes), `/admin` (Résultats, Modération). Logique dans `app/src/lib/` (`parcours.js`, `pronostic.js`, `tendances.js`, `photos.js`, `marque.js`). DA : « Scrutin épuré », titres en Newsreader, texte en Geist, emblème ☝️.
- **Nom** : « Au doigt mouillé », sous-titre « Pronostics pour la présidentielle 2027 » (défini dans `app/src/lib/marque.js`).
- **Base de production** : seulement `game_state`, `paris` et `private.admin_secret`. Les anciennes tables (`players`, `periodes`, `pronostics`, `private.player_secrets`) et fonctions (codes, périodes, `create_pari`…) ont été supprimées par la v8 ; leur contenu n'existe plus que dans `backups/2026-11-13_1400/` (à conserver).
- **Reste à faire** : 1) prévenir le groupe (nouvelle adresse + ce qui change) ; 2) décider si `pari2027.vercel.app` redirige vers `audoigtmouille.vercel.app` (Settings → Domains → Edit → Redirect to) ; 3) supprimer les variables Vercel « Preview » et le projet Supabase de test (devenu inutile) ; 4) brique de scoring quand les candidats officiels seront connus.

## Documents

| Fichier | Contenu |
|---|---|
| [docs/pivot-pronostics.md](docs/pivot-pronostics.md) | **Produit actuel** (13/11) : pronostics avec pseudo, sans score ni période |
| [docs/refonte-fonctionnelle.md](docs/refonte-fonctionnelle.md) | Ancien cadrage (remplacé par le pivot) : paris datés, classements par période |
| [docs/refonte-plan-technique.md](docs/refonte-plan-technique.md) | Modèle de données, fonctions SQL, lots 0 à 8, risques |
| [docs/refonte-ui.md](docs/refonte-ui.md) | Cadrage validé de la refonte UI : décisions, arborescence, parcours, lots A à H |
| [specs_pari2027.docx](specs_pari2027.docx) | Specs d'origine (avril 2026). Le code a divergé : un seul classement qui additionne les phases, pas deux. |
| `supabase_schema.sql`, `supabase_migration_v2.sql`, `supabase_migration_v3_securite.sql`, `supabase_migration_v4_paris.sql`, `supabase_migration_v5_nettoyage.sql`, `supabase_migration_v6_pronostics.sql`, `supabase_migration_v7_scores_gagnants.sql`, `supabase_migration_v8_nettoyage.sql` | Schéma et migrations, à jouer dans cet ordre (la v8 retire l'ancien modèle : les fichiers antérieurs décrivent l'historique, pas la base actuelle). `supabase_test_v4.sql` : tests SQL de la v4, à jouer sur la base de test seulement (tout est annulé en fin de script). |

## Architecture

- **Frontend** : React 19 + Vite dans `app/`. Tout l'accès aux données passe par [app/src/store/GameContext.jsx](app/src/store/GameContext.jsx). Logique pure dans `app/src/lib/` (tests Vitest : `npm --prefix app test`).
- **Base** : Supabase. Tables : `paris` (les pronostics ; colonnes `pseudo`, `m1` à `m5`, `masque` ; `player_id`, `periode` et `legacy_pronostic_id` ne sont que des valeurs d'origine des 10 premiers paris) et `game_state` (résultats réels et liste officielle des candidats). Le public n'a que la **lecture** : `paris` seulement les pronostics non masqués. Toute écriture passe par des fonctions SQL `SECURITY DEFINER` :
  - public : `create_pronostic` (pseudo, sans code, validé côté serveur : 2 à 40 candidats, total 100 %, finalistes = deux premiers, vainqueur à plus de 50 % ; anti-rafale : un pronostic par pseudo et par minute, 120 par heure) ;
  - admin (mot de passe haché en bcrypt dans `private.admin_secret`, schéma non exposé par l'API) : `admin_login`, `admin_save_results`, `admin_save_official_candidates`, `admin_set_masque`, `admin_paris_masques`.
- **Hébergement** : Vercel, projet `audoigtmouille`, relié au dépôt GitHub `fitch90210/pari2027` (public), **Root Directory = `app`** (`app/.vercel/project.json` garde l'ancien nom `app`, sans conséquence : seul l'identifiant compte). Un push sur `main` déploie en production.
- **Keepalive** : [app/api/keepalive.js](app/api/keepalive.js) + cron quotidien (8h UTC) dans `app/vercel.json`, pour que Supabase gratuit ne se mette pas en pause.

## Environnement de test

- **Base Supabase de test** : `https://yrgbugbasrilwxkqmhnm.supabase.co`, aux mêmes migrations que la production (v6 et v8 jouées ; son contenu est fictif). Son mot de passe admin est différent de celui de la production.
- **Vercel** : `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont définies pour **Preview** (base de test) et **Production** (vraie base). Tout push sur une autre branche que `main` donne une URL de preview branchée sur la base de test.
- À supprimer, devenus inutiles : le projet Supabase de test et les variables Preview.

## Opérations

- **Lancer en local** : `npm --prefix app install` puis `npm --prefix app run dev` (config `.claude/launch.json`, port 5174). Nécessite `app/.env` (non versionné).
- **Déployer** : pousser sur `main`. Ne plus lancer `vercel --prod` depuis `app/` (le Root Directory ferait chercher `app/app`).
- **CLI Vercel** : `/Users/paulalbagli/.nvm/versions/node/v20.9.0/bin/vercel` (absente du PATH de la version de Node par défaut).
- **SQL** : Claude n'a que la clé `anon`. Toute migration se fait en collant le SQL dans Supabase > SQL Editor ; l'alerte « destructive operations » sur des `DROP POLICY`/`REVOKE` est normale, choisir « Run and enable RLS ».
- **Sauvegarde** : lire les tables (`game_state`, `paris`) via l'API REST avec la clé `anon` et les écrire dans `backups/<date>/` (dernière complète, avec les anciennes tables : `backups/2026-11-13_1400/`).
- **Lint** : 1 erreur préexistante (`only-export-components` dans `GameContext.jsx`), non bloquante.
- **Maquette locale** : config `pari2027-maquette` de `.claude/launch.json` (port 5175) + faux Supabase sur le port 54399 (script à recréer : sert `paris`/`game_state` depuis une sauvegarde, simule `create_pronostic` et l'admin).

## Fichiers locaux non versionnés

- `secrets/codes.txt` : mot de passe admin (les codes des anciens joueurs ne servent plus). **Ne jamais les recopier ailleurs ni les afficher.**
- `secrets/codes_initiaux.local.sql`, `secrets/test_bootstrap.local.sql`, `secrets/codes_test.txt` : historique, sans usage courant.
- `backups/` : sauvegardes JSON des données réelles.
- `app/.env`, `app/.env.vercel*` : variables et tokens.

## Conventions

- Tout en français : interface, commits, documentation.
- Supabase gratuit : le projet de prod se met en pause après 7 jours sans activité (le keepalive l'évite). Si l'API ne répond plus, vérifier le dashboard avant toute autre hypothèse.

# ☝️ Au doigt mouillé

Pronostics entre amis pour l'élection présidentielle française de 2027 : qui sera au premier tour, avec quels scores, qui ira au second tour et qui l'emportera.

**[audoigtmouille.vercel.app](https://audoigtmouille.vercel.app)**

![Page d'accueil](docs/accueil.png)

## Le concept

On poste un pronostic avec un simple **pseudo**, sans compte ni code, depuis un téléphone ou un ordinateur, et on voit ce que les autres pronostiquent.

Un pronostic couvre **toujours les deux tours** :

1. **1er tour** : les candidats et leur pourcentage (total 100 %).
2. **2nd tour** : les finalistes sont les deux premiers du 1er tour ; on choisit le vainqueur et son score (plus de 50 %), le vaincu a le complément.
3. **Pseudo** et récapitulatif, puis envoi.

Un pronostic est définitif : pour changer d'avis, on en poste un nouveau. Les tendances ne retiennent que le dernier pronostic de chaque pseudo, la liste les montre tous.

Pas de score ni de classement pour l'instant : une brique de scoring viendra quand la liste officielle des candidats sera connue.

![Tendances du 1er tour](docs/pronostics.png)

## Écrans

| Adresse | Contenu |
|---|---|
| `/` | La promesse, le nombre de pronostics, le vainqueur le plus pronostiqué, les derniers pronostics |
| `/pronostics` | 1er tour / 2nd tour : les tendances candidat par candidat, puis la liste des pronostics |
| `/pronostics/:id` | Le détail d'un pronostic |
| `/pronostiquer` | La saisie en trois étapes |
| `/admin` | Résultats réels et modération (masquer ou réafficher un pronostic) |

## Stack

| Couche | Choix |
|---|---|
| Frontend | React 19, React Router, Vite |
| Données | Supabase (PostgreSQL) |
| Hébergement | Vercel (site statique + une fonction serverless) |

Pas de backend applicatif : le frontend parle directement à Supabase. Toute la logique sensible vit dans PostgreSQL.

## Sécurité sans comptes

- **Lecture seule pour le public** : les politiques Row Level Security n'autorisent que la lecture, et seulement des pronostics non masqués.
- **Écritures via des fonctions SQL** `SECURITY DEFINER` :
  - `create_pronostic` (publique) valide tout côté serveur : 2 à 40 candidats, total de 100 %, finalistes = deux premiers, vainqueur à plus de 50 %, pseudo de 30 caractères au plus ; anti-rafale (un pronostic par pseudo et par minute, 120 par heure) ;
  - les fonctions d'administration (`admin_login`, `admin_save_results`, `admin_set_masque`…) vérifient un **mot de passe haché** (bcrypt via `pgcrypto`) rangé dans un schéma `private` non exposé par l'API.

## Structure

```
app/
  api/keepalive.js         Ping quotidien (cron Vercel) pour que Supabase gratuit ne se mette pas en pause
  src/
    pages/                 Accueil, pronostics (tendances, liste, détail), pronostiquer, admin
    ui/, layout/           Composants d'interface et coque de l'application
    store/GameContext.jsx  État global et accès aux données
    lib/                   Logique pure testée (parcours, pronostic, tendances, photos, marque)
    data/                  Candidats potentiels et photos
docs/                      Cadrage produit (pivot-pronostics.md) et historique de la refonte
supabase_schema.sql        Schéma initial
supabase_migration_*.sql   Migrations successives (v2 à v8)
```

## Lancer en local

```bash
cd app
npm install
cp .env.example .env   # renseigner l'URL et la clé anon du projet Supabase
npm run dev
npm test               # tests Vitest de app/src/lib
```

Pour une base neuve, exécuter dans l'éditeur SQL de Supabase, dans l'ordre : `supabase_schema.sql` puis les migrations `v2` à `v8`, et définir le mot de passe admin dans `private.admin_secret`. La v8 retire l'ancien modèle (joueurs, périodes, codes) : les fichiers antérieurs décrivent l'historique, pas la base actuelle.

## Déploiement

Chaque push sur `main` est déployé automatiquement par Vercel (Root Directory : `app`). Les variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont à définir dans le projet Vercel.

## Historique

Le projet s'appelait **Pari 2027** : paris par phases, codes joueurs, barème et classement ([specs d'origine](specs_pari2027.docx)). Il a été simplifié le 13 novembre 2026 en un site de pronostics avec pseudo ([docs/pivot-pronostics.md](docs/pivot-pronostics.md)). L'ancienne adresse [pari2027.vercel.app](https://pari2027.vercel.app) répond toujours.

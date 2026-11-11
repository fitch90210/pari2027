# Pari 2027

Jeu de pronostics entre amis pour l'élection présidentielle française de 2027 : qui sera candidat, avec quels scores, qui ira au second tour et qui l'emportera.

**[pari2027.vercel.app](https://pari2027.vercel.app)**

![Page d'accueil](docs/accueil.png)

## Le concept

Un groupe d'amis parie sur l'élection, un an avant le premier tour. L'application est accessible par un simple lien, sans compte à créer, depuis un téléphone ou un ordinateur.

Le jeu se joue en **trois phases**, ouvertes par l'administrateur au fil du calendrier électoral :

| Phase | Quand | Ce qu'on pronostique |
|---|---|---|
| 1 | Un an avant le 1er tour | Tout, à l'aveugle |
| 2 | Liste officielle des candidats connue | Tout, avec les vrais candidats |
| 3 | Entre les deux tours | Le score du second tour |

Chaque phase compte **cinq pronostics** :

| # | Pronostic | Barème |
|---|---|---|
| 1 | Candidats présents au 1er tour | +2 pts par candidat correct, +3 si le nombre total est exact |
| 2 | Scores du 1er tour | +2 pts par score à ±2 points du résultat réel |
| 3 | Les deux finalistes | +8 si les deux sont bons, +3 pour un seul |
| 4 | Le vainqueur | +6 pts |
| 5 | Score du vainqueur au 2nd tour | +2 pts si à ±2 points |

Chaque phase est scorée indépendamment ; le classement général fait la somme. En cas d'égalité, le meilleur score au pronostic 2 départage.

![Pronostics des joueurs](docs/pronostics.png)

## Fonctionnalités

- **Saisie guidée** : recherche de candidats avec photos, finalistes déduits des scores saisis, sauvegarde automatique à chaque modification
- **Lecture publique** de tous les pronostics et des classements
- **Gel automatique** des pronostics d'une phase quand la suivante s'ouvre
- **Panneau d'administration** : changement de phase, saisie des résultats officiels, gestion des joueurs et de leurs codes
- **Responsive**, pensé d'abord pour le mobile

## Stack

| Couche | Choix |
|---|---|
| Frontend | React 19, React Router, Vite |
| Données | Supabase (PostgreSQL) |
| Hébergement | Vercel (site statique + une fonction serverless) |

Pas de backend applicatif : le frontend parle directement à Supabase. Toute la logique sensible vit dans PostgreSQL.

## Sécurité sans comptes utilisateurs

L'application devait rester sans inscription, mais un lien public ne doit pas permettre d'effacer ou de modifier les paris des autres. Le modèle retenu :

- **Lecture seule pour le public.** Les politiques Row Level Security n'autorisent que la lecture ; les droits d'écriture directe sont retirés.
- **Écritures via des fonctions SQL** (`SECURITY DEFINER`) qui vérifient un secret avant d'agir :
  - chaque joueur a un **code à 4 chiffres**, demandé une fois par appareil, pour modifier ses propres pronostics ;
  - l'administrateur a un **mot de passe vérifié côté serveur**, jamais embarqué dans le code client.
- **Secrets hachés** (bcrypt via `pgcrypto`) dans un schéma `private` non exposé par l'API.
- **Anti force brute** : 5 codes faux bloquent le joueur 15 minutes.
- Les fonctions refusent aussi une écriture sur une phase close ou gelée, et valident la taille des données.

Le détail est dans [`supabase_migration_v3_securite.sql`](supabase_migration_v3_securite.sql).

## Structure

```
app/
  api/keepalive.js        Ping quotidien (cron Vercel) pour éviter la mise en pause de Supabase
  src/
    pages/                Accueil, Pronostics, Tous les pronostics, Classements, Admin
    components/           Navigation, avatars des candidats, vue de lecture, confettis
    store/GameContext.jsx État global et accès aux données
    lib/scoring.js        Moteur de calcul des points
    data/                 Liste des candidats potentiels et photos
supabase_schema.sql       Schéma initial
supabase_migration_*.sql  Migrations successives
specs_pari2027.docx       Spécifications d'origine
```

## Lancer en local

```bash
cd app
npm install
cp .env.example .env   # renseigner l'URL et la clé anon du projet Supabase
npm run dev
```

Pour une base neuve, exécuter dans l'éditeur SQL de Supabase, dans l'ordre : `supabase_schema.sql`, `supabase_migration_v2.sql`, `supabase_migration_v3_securite.sql`, puis définir le mot de passe admin dans `private.admin_secret`.

## Déploiement

Chaque push sur `main` est déployé automatiquement par Vercel. Les variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont à définir dans le projet Vercel.

# Pivot « pronostics » — 13 novembre 2026

Décision de Paul : on retire tout ce qui complique le produit (périodes, score, codes, profils,
classement, démo). Le site devient : **tu entres ton pronostic pour la présidentielle et tu vois ce
que les autres pronostiquent.** Ce document remplace, pour le produit, `refonte-fonctionnelle.md`
(périodes, bonus, classement) ; la direction artistique de `refonte-ui.md` reste valable.

## Règles du produit

| Sujet | Décision |
|---|---|
| Identité | Aucun compte, aucun code. Un **pseudo** libre, demandé au moment de valider. Il est mémorisé sur l'appareil pour la fois suivante. |
| Contenu d'un pronostic | **Toujours les deux tours** : les candidats du 1er tour et leur pourcentage (total 100 %), puis le 2nd tour (vainqueur, vaincu et leurs pourcentages). |
| 2nd tour | Les finalistes sont **les deux premiers du 1er tour du pronostic**. On choisit le vainqueur et son score (plus de 50 %) ; le vaincu a le complément. |
| Nombre | Autant de pronostics qu'on veut, sous le même pseudo ou non. |
| Modification | **Aucune.** Un pronostic est définitif ; pour changer d'avis, on en poste un nouveau. |
| Agrégats | Pour les tendances, on retient le **dernier pronostic de chaque pseudo** (insensible à la casse), pour qu'un changement d'avis ne compte pas double. La liste, elle, montre tout. |
| Modération | L'admin peut **masquer** un pronostic (il reste en base, n'est plus lisible publiquement) et le réafficher. |
| Score | Plus de score ni de classement. Une brique de scoring pourra être ajoutée quand les candidats officiels seront connus. |
| Admin | Réduite à : saisie des résultats réels (sans effet pour l'instant) et masquage des pronostics. Plus de périodes ni de gestion de joueurs. |
| Nom | **« Au doigt mouillé »**, sous-titre « Pronostics pour la présidentielle 2027 » (choisi le 13/11 après trois séries de propositions). Dans l'interface on parle de **pronostics**. |

## Écrans

- **Accueil** : la promesse, le bouton « Pronostiquer », les derniers pronostics.
- **Pronostics** (`/pronostics`) : sélecteur **1er tour / 2nd tour**. Pour chaque tour : les tendances
  (candidat par candidat, chaque pourcentage attribué visible au survol de l'avatar ; au 2nd tour :
  les duels, les vainqueurs, les scores), puis **la liste des pronostics, du plus récent au plus ancien**
  (pseudo, date, détail du tour).
- **Pronostiquer** (`/pronostiquer`) : 3 étapes. 1) Candidats et scores du 1er tour. 2) Le 2nd tour.
  3) Pseudo et récapitulatif. Puis confirmation.
- **Admin** (`/admin`, lien discret en pied de page) : Résultats, Modération.
- Supprimés : Règles, Classement, Profils, Démo. Les anciennes adresses redirigent.

## Données

Migration `supabase_migration_v6_pronostics.sql` (additive) :
- `paris.pseudo` (rempli avec le nom du joueur pour les 10 paris existants), `paris.masque` ;
- `paris.player_id` et `paris.periode` deviennent facultatifs (les nouveaux pronostics n'en ont pas) ;
- lecture publique limitée aux pronostics non masqués ;
- `create_pronostic` (public, sans code, validé côté serveur, anti-rafale), `admin_set_masque`, `admin_paris_masques`.

Les anciennes tables et fonctions (`players`, `periodes`, `pronostics`, `create_pari`, codes…) ne sont
pas touchées : elles seront retirées plus tard, après la bascule, avec une sauvegarde.

Données existantes : 10 paris. 8 sont complets ; 2 n'ont que des candidats, sans scores ni 2nd tour :
ils restent visibles dans la liste du 1er tour. 4 paris donnent au vainqueur moins de 50 % (l'ancienne
interface ne bornait rien) : on les affiche tels quels, le vaincu prenant le complément.

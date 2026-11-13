-- ============================================================
-- Migration v7 — Score du gagnant toujours au-dessus de 50 %
-- À exécuter dans : Supabase Dashboard > SQL Editor (production)
-- Après la sauvegarde JSON des tables (backups/2026-11-13_1342/ faite avant la v6).
--
-- Contexte : dans l'ancienne interface, certains paris donnent au vainqueur un score sous
-- 50 % (ex. Philippe gagnant à 32,9 %). Le vainqueur choisi est le bon ; le score saisi
-- était celui de l'autre finaliste. On attribue donc au vainqueur 100 - le score saisi.
--
-- Corrige 5 lignes de `paris` (score du vainqueur seulement). Ne touche NI au vainqueur, NI aux
-- candidats, NI à la table d'archive `pronostics`, qui garde les valeurs d'origine.
-- REJOUABLE : une fois corrigés, les scores sont au-dessus de 50 %, un rejeu ne change plus rien.
-- ============================================================

BEGIN;

UPDATE public.paris
   SET m5 = round(100 - m5, 1)
 WHERE m5 IS NOT NULL
   AND m5 < 50
   AND m4 <> ''
   AND legacy_pronostic_id IS NOT NULL;   -- seulement les paris repris de l'ancien modèle

-- Contrôle : plus aucun vainqueur sous 50 %, et les vainqueurs n'ont pas bougé
DO $$
DECLARE restants INTEGER; sans_gagnant_en_finale INTEGER;
BEGIN
  SELECT count(*) INTO restants FROM public.paris WHERE m4 <> '' AND m5 IS NOT NULL AND m5 < 50;
  IF restants > 0 THEN RAISE EXCEPTION 'Contrôle : % pari(s) avec un vainqueur sous 50 %%', restants; END IF;

  SELECT count(*) INTO sans_gagnant_en_finale FROM public.paris WHERE m4 <> '' AND NOT (m3 ? m4);
  IF sans_gagnant_en_finale > 0 THEN RAISE EXCEPTION 'Contrôle : % pari(s) dont le vainqueur n''est pas finaliste', sans_gagnant_en_finale; END IF;

  RAISE NOTICE 'Contrôle OK';
END $$;

COMMIT;

-- Résultat attendu : 8 lignes, tous les scores entre 50 et 100
SELECT pseudo, m4 AS vainqueur, m5 AS score_vainqueur
  FROM public.paris WHERE m4 <> '' ORDER BY created_at;

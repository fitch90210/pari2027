-- ============================================================
-- Migration v5 — Nettoyage après la bascule sur les paris
-- À exécuter dans : Supabase Dashboard > SQL Editor (production)
--
-- Retire les deux fonctions de l'ancien modèle par phases.
-- Ne touche à AUCUNE donnée : la table `pronostics` reste en place
-- comme archive (lecture seule), `game_state.session` aussi.
-- ============================================================

DROP FUNCTION IF EXISTS public.save_pronostic(TEXT, TEXT, INTEGER, JSONB, JSONB, JSONB, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS public.admin_set_session(TEXT, INTEGER);

NOTIFY pgrst, 'reload schema';

-- Contrôle : doit renvoyer 0 ligne
SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND proname IN ('save_pronostic', 'admin_set_session');

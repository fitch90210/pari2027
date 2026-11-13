-- ============================================================
-- Migration v8 — Nettoyage : retrait de l'ancien modèle (joueurs, codes, périodes)
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- ORDRE CONSEILLÉ : d'abord sur la base de TEST (répétition), puis sur la production.
--
-- ⚠ DESTRUCTIF pour les anciennes tables `players`, `periodes`, `pronostics` et
-- `private.player_secrets` : leur contenu est perdu en base. Il est sauvegardé en JSON
-- dans backups/2026-11-13_1400/ (à garder). La table `paris` (les pronostics) n'est PAS
-- touchée : ses lignes, ses colonnes et ses valeurs restent identiques.
--
-- Ce qui est retiré
--   tables      : public.players, public.periodes, public.pronostics, private.player_secrets
--   fonctions   : create_player, verify_player_code, create_pari, update_pari,
--                 admin_create_player, admin_reset_player_code, admin_remove_player,
--                 admin_save_periodes (public) ; random_code, check_player_code,
--                 periode_courante, clean_pari (private)
--   contraintes : paris -> players et paris -> periodes (clés étrangères)
-- Ce qui reste : game_state, paris (colonnes player_id, periode et legacy_pronostic_id
--   conservées comme simples valeurs d'origine), private.admin_secret, assert_admin,
--   create_pronostic, admin_login, admin_save_results, admin_save_official_candidates,
--   admin_set_masque, admin_paris_masques.
--
-- AUCUN « CASCADE » : si un objet retiré avait encore une dépendance inattendue, la
-- migration échoue et TOUT est annulé (transaction). Rejouable.
-- ============================================================

BEGIN;

-- ── État avant, pour le contrôle final ────────────────────────
CREATE TEMP TABLE _avant ON COMMIT DROP AS
  SELECT count(*)::int AS n_paris,
         md5(string_agg(id::text || '|' || coalesce(pseudo, '') || '|' || m1::text || '|' || m2::text || '|' ||
                        m3::text || '|' || m4 || '|' || coalesce(m5::text, '') || '|' || created_at::text || '|' || masque::text,
                        ';' ORDER BY id)) AS empreinte
    FROM public.paris;

-- ── 1. Les clés étrangères de paris vers les tables retirées ──
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'public.paris'::regclass AND contype = 'f'
  LOOP
    EXECUTE format('ALTER TABLE public.paris DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

-- ── 2. Les fonctions de l'ancien modèle ───────────────────────
DROP FUNCTION IF EXISTS public.create_player(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.verify_player_code(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_pari(TEXT, TEXT, JSONB, JSONB, JSONB, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS public.update_pari(BIGINT, TEXT, TEXT, JSONB, JSONB, JSONB, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS public.admin_create_player(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.admin_reset_player_code(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.admin_remove_player(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.admin_save_periodes(TEXT, JSONB);
DROP FUNCTION IF EXISTS private.check_player_code(TEXT, TEXT);
DROP FUNCTION IF EXISTS private.random_code();
DROP FUNCTION IF EXISTS private.clean_pari(INTEGER, JSONB, JSONB, JSONB, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS private.periode_courante();

-- ── 3. Les tables de l'ancien modèle ──────────────────────────
DROP TABLE IF EXISTS private.player_secrets;
DROP TABLE IF EXISTS public.pronostics;
DROP TABLE IF EXISTS public.players;
DROP TABLE IF EXISTS public.periodes;

-- ── 4. Contrôles : si un seul échoue, tout est annulé ─────────
DO $$
DECLARE a RECORD; b RECORD; manquants TEXT; restes TEXT;
BEGIN
  -- paris : même nombre de lignes, même contenu
  SELECT * INTO a FROM _avant;
  SELECT count(*)::int AS n_paris,
         md5(string_agg(id::text || '|' || coalesce(pseudo, '') || '|' || m1::text || '|' || m2::text || '|' ||
                        m3::text || '|' || m4 || '|' || coalesce(m5::text, '') || '|' || created_at::text || '|' || masque::text,
                        ';' ORDER BY id)) AS empreinte
    INTO b FROM public.paris;
  IF a.n_paris <> b.n_paris OR a.empreinte IS DISTINCT FROM b.empreinte THEN
    RAISE EXCEPTION 'Contrôle : la table paris a changé (avant % lignes, après %)', a.n_paris, b.n_paris;
  END IF;

  -- ce que le site utilise est toujours là
  SELECT string_agg(f, ', ') INTO manquants
    FROM unnest(ARRAY['public.create_pronostic', 'public.admin_login', 'public.admin_save_results',
                      'public.admin_save_official_candidates', 'public.admin_set_masque',
                      'public.admin_paris_masques', 'private.assert_admin']) AS f
   WHERE NOT EXISTS (
     SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname || '.' || p.proname = f);
  IF manquants IS NOT NULL THEN RAISE EXCEPTION 'Contrôle : fonction(s) manquante(s) : %', manquants; END IF;
  IF to_regclass('public.game_state') IS NULL OR to_regclass('private.admin_secret') IS NULL THEN
    RAISE EXCEPTION 'Contrôle : game_state ou admin_secret manquant';
  END IF;

  -- l'ancien modèle a disparu
  SELECT string_agg(o, ', ') INTO restes FROM (
    SELECT n.nspname || '.' || c.relname AS o FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE c.relname IN ('players', 'periodes', 'pronostics', 'player_secrets') AND n.nspname IN ('public', 'private')
    UNION ALL
    SELECT n.nspname || '.' || p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE p.proname IN ('create_player', 'verify_player_code', 'create_pari', 'update_pari', 'admin_create_player',
                         'admin_reset_player_code', 'admin_remove_player', 'admin_save_periodes', 'check_player_code',
                         'random_code', 'clean_pari', 'periode_courante', 'save_pronostic', 'admin_set_session')
       AND n.nspname IN ('public', 'private')) t;
  IF restes IS NOT NULL THEN RAISE EXCEPTION 'Contrôle : il reste : %', restes; END IF;

  -- la table paris est toujours en lecture publique seule (non masqués)
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid = 'public.paris'::regclass AND relrowsecurity) THEN
    RAISE EXCEPTION 'Contrôle : la sécurité par lignes de paris est désactivée';
  END IF;

  RAISE NOTICE 'Contrôle OK : % pari(s) inchangés, ancien modèle retiré', b.n_paris;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- Résultat attendu : 1re requête = 10 lignes (ou davantage si de nouveaux pronostics ont été postés),
-- 2e requête = uniquement game_state et paris.
SELECT id, pseudo, masque, created_at FROM public.paris ORDER BY created_at;
SELECT table_schema, table_name FROM information_schema.tables
 WHERE table_schema IN ('public', 'private') ORDER BY 1, 2;

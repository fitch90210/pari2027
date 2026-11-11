-- ============================================================
-- Migration v3 — Sécurisation (codes joueurs + admin côté serveur)
-- À exécuter dans : Supabase Dashboard > SQL Editor
--
-- Ne supprime AUCUNE donnée. Effets :
--   * Le public garde la lecture seule sur les 3 tables.
--   * Toute écriture passe par des fonctions qui vérifient :
--       - le code à 4 chiffres du joueur (pour ses propres paris),
--       - le mot de passe admin (pour la gestion).
--   * Les secrets sont hachés (bcrypt) dans un schéma non exposé.
--   * 5 codes faux d'affilée bloquent un joueur 15 minutes.
-- Exécuter ensuite secrets/codes_initiaux.local.sql (codes des joueurs
-- existants + mot de passe admin).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ── Schéma privé (non exposé par l'API) ───────────────────────
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.player_secrets (
  player_id    TEXT PRIMARY KEY REFERENCES public.players(id) ON DELETE CASCADE,
  code_hash    TEXT NOT NULL,
  failures     INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS private.admin_secret (
  id       INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  pin_hash TEXT NOT NULL
);

-- ── RLS : lecture publique uniquement ─────────────────────────
DROP POLICY IF EXISTS "game_state_write"  ON public.game_state;
DROP POLICY IF EXISTS "players_insert"    ON public.players;
DROP POLICY IF EXISTS "players_delete"    ON public.players;
DROP POLICY IF EXISTS "pronostics_insert" ON public.pronostics;
DROP POLICY IF EXISTS "pronostics_update" ON public.pronostics;
DROP POLICY IF EXISTS "pronostics_delete" ON public.pronostics;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.game_state, public.players, public.pronostics
  FROM anon, authenticated;

-- ── Helpers privés ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION private.random_code()
RETURNS TEXT LANGUAGE sql VOLATILE SET search_path = '' AS $$
  SELECT lpad(((get_byte(b, 0) * 256 + get_byte(b, 1)) % 10000)::text, 4, '0')
  FROM (SELECT extensions.gen_random_bytes(2) AS b) s;
$$;

-- Vérifie le code d'un joueur et tient le compteur d'échecs.
-- Retourne 'ok', 'bad_code', 'locked' ou 'no_code'.
-- Ne lève jamais d'exception (sinon le compteur serait annulé).
CREATE OR REPLACE FUNCTION private.check_player_code(p_player_id TEXT, p_code TEXT)
RETURNS TEXT LANGUAGE plpgsql VOLATILE SET search_path = '' AS $$
DECLARE s private.player_secrets%ROWTYPE;
BEGIN
  SELECT * INTO s FROM private.player_secrets WHERE player_id = p_player_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'no_code'; END IF;
  IF s.locked_until IS NOT NULL AND s.locked_until > now() THEN RETURN 'locked'; END IF;
  IF p_code IS NOT NULL AND s.code_hash = extensions.crypt(p_code, s.code_hash) THEN
    UPDATE private.player_secrets SET failures = 0, locked_until = NULL WHERE player_id = p_player_id;
    RETURN 'ok';
  END IF;
  UPDATE private.player_secrets
     SET failures = CASE WHEN s.failures + 1 >= 5 THEN 0 ELSE s.failures + 1 END,
         locked_until = CASE WHEN s.failures + 1 >= 5 THEN now() + interval '15 minutes' ELSE NULL END
   WHERE player_id = p_player_id;
  RETURN 'bad_code';
END $$;

CREATE OR REPLACE FUNCTION private.assert_admin(p_pin TEXT)
RETURNS VOID LANGUAGE plpgsql STABLE SET search_path = '' AS $$
BEGIN
  IF p_pin IS NULL OR NOT EXISTS (
    SELECT 1 FROM private.admin_secret WHERE pin_hash = extensions.crypt(p_pin, pin_hash)
  ) THEN
    RAISE EXCEPTION 'Mot de passe admin incorrect' USING ERRCODE = '28000';
  END IF;
END $$;

-- ── API publique : joueurs ────────────────────────────────────

-- Vérifie le code d'un joueur (écran de connexion).
CREATE OR REPLACE FUNCTION public.verify_player_code(p_player_id TEXT, p_code TEXT)
RETURNS TEXT LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  RETURN private.check_player_code(p_player_id, p_code);
END $$;

-- Crée un joueur avec son propre code à 4 chiffres.
CREATE OR REPLACE FUNCTION public.create_player(p_name TEXT, p_code TEXT)
RETURNS public.players LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE p public.players;
BEGIN
  p_name := btrim(p_name);
  IF p_name IS NULL OR length(p_name) = 0 OR length(p_name) > 40 THEN
    RAISE EXCEPTION 'Nom invalide (1 à 40 caractères)';
  END IF;
  IF p_code IS NULL OR p_code !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'Le code doit faire 4 chiffres';
  END IF;
  INSERT INTO public.players (name) VALUES (p_name) RETURNING * INTO p;
  INSERT INTO private.player_secrets (player_id, code_hash)
    VALUES (p.id, extensions.crypt(p_code, extensions.gen_salt('bf')));
  RETURN p;
END $$;

-- Enregistre le pronostic d'un joueur pour la phase active.
-- Retourne 'ok', 'bad_code', 'locked', 'no_code', 'wrong_session' ou 'frozen'.
CREATE OR REPLACE FUNCTION public.save_pronostic(
  p_player_id TEXT, p_code TEXT, p_session INTEGER,
  p_m1 JSONB, p_m2 JSONB, p_m3 JSONB, p_m4 TEXT, p_m5 NUMERIC
) RETURNS TEXT LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE status TEXT;
BEGIN
  status := private.check_player_code(p_player_id, p_code);
  IF status <> 'ok' THEN RETURN status; END IF;

  IF p_session IS DISTINCT FROM (SELECT session FROM public.game_state WHERE id = 1) THEN
    RETURN 'wrong_session';
  END IF;
  IF EXISTS (SELECT 1 FROM public.pronostics
             WHERE player_id = p_player_id AND session = p_session AND locked_at IS NOT NULL) THEN
    RETURN 'frozen';
  END IF;

  -- Garde-fous de taille / format
  IF jsonb_typeof(coalesce(p_m1, '[]')) <> 'array' OR jsonb_array_length(coalesce(p_m1, '[]')) > 40
     OR jsonb_typeof(coalesce(p_m2, '{}')) <> 'object' OR length(coalesce(p_m2, '{}')::text) > 5000
     OR jsonb_typeof(coalesce(p_m3, '[]')) <> 'array' OR jsonb_array_length(coalesce(p_m3, '[]')) > 2
     OR length(coalesce(p_m4, '')) > 100
     OR (p_m5 IS NOT NULL AND (p_m5 < 0 OR p_m5 > 100)) THEN
    RAISE EXCEPTION 'Pronostic invalide';
  END IF;

  INSERT INTO public.pronostics (player_id, session, m1, m2, m3, m4, m5, updated_at)
  VALUES (p_player_id, p_session, coalesce(p_m1, '[]'), coalesce(p_m2, '{}'),
          coalesce(p_m3, '[]'), coalesce(p_m4, ''), p_m5, now())
  ON CONFLICT (player_id, session) DO UPDATE
    SET m1 = EXCLUDED.m1, m2 = EXCLUDED.m2, m3 = EXCLUDED.m3,
        m4 = EXCLUDED.m4, m5 = EXCLUDED.m5, updated_at = now();
  RETURN 'ok';
END $$;

-- ── API admin ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_login(p_pin TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM private.assert_admin(p_pin);
  RETURN TRUE;
EXCEPTION WHEN SQLSTATE '28000' THEN
  PERFORM pg_sleep(1); -- ralentit les essais en série
  RETURN FALSE;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_session(p_pin TEXT, p_session INTEGER)
RETURNS VOID LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM private.assert_admin(p_pin);
  IF p_session NOT IN (1, 2, 3) THEN RAISE EXCEPTION 'Phase invalide'; END IF;
  IF p_session > 1 THEN
    UPDATE public.pronostics SET locked_at = now()
     WHERE session = p_session - 1 AND locked_at IS NULL;
  END IF;
  UPDATE public.game_state SET session = p_session, updated_at = now() WHERE id = 1;
END $$;

CREATE OR REPLACE FUNCTION public.admin_save_results(p_pin TEXT, p_results JSONB)
RETURNS VOID LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM private.assert_admin(p_pin);
  UPDATE public.game_state SET results = p_results, updated_at = now() WHERE id = 1;
END $$;

CREATE OR REPLACE FUNCTION public.admin_save_official_candidates(p_pin TEXT, p_candidates JSONB)
RETURNS VOID LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM private.assert_admin(p_pin);
  UPDATE public.game_state SET official_candidates_r1 = p_candidates, updated_at = now() WHERE id = 1;
END $$;

-- Crée un joueur et renvoie son code généré : { player, code }
CREATE OR REPLACE FUNCTION public.admin_create_player(p_pin TEXT, p_name TEXT)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE c TEXT := private.random_code(); p public.players;
BEGIN
  PERFORM private.assert_admin(p_pin);
  p := public.create_player(p_name, c);
  RETURN jsonb_build_object('player', to_jsonb(p), 'code', c);
END $$;

-- Génère un nouveau code pour un joueur (code oublié) et le renvoie.
CREATE OR REPLACE FUNCTION public.admin_reset_player_code(p_pin TEXT, p_player_id TEXT)
RETURNS TEXT LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE c TEXT := private.random_code();
BEGIN
  PERFORM private.assert_admin(p_pin);
  IF NOT EXISTS (SELECT 1 FROM public.players WHERE id = p_player_id) THEN
    RAISE EXCEPTION 'Joueur introuvable';
  END IF;
  INSERT INTO private.player_secrets (player_id, code_hash)
    VALUES (p_player_id, extensions.crypt(c, extensions.gen_salt('bf')))
  ON CONFLICT (player_id) DO UPDATE
    SET code_hash = EXCLUDED.code_hash, failures = 0, locked_until = NULL;
  RETURN c;
END $$;

CREATE OR REPLACE FUNCTION public.admin_remove_player(p_pin TEXT, p_player_id TEXT)
RETURNS VOID LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM private.assert_admin(p_pin);
  DELETE FROM public.players WHERE id = p_player_id;
END $$;

-- Les helpers privés ne sont pas appelables depuis l'API
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon, authenticated;

-- Recharge le cache de l'API pour exposer les nouvelles fonctions
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- Migration v4 — Refonte « paris à tout moment, sans phases »
-- À exécuter dans : Supabase Dashboard > SQL Editor
--
-- ADDITIVE : aucune table existante n'est modifiée ni supprimée.
-- `pronostics` reste en place (archive), `save_pronostic` et
-- `admin_set_session` aussi (retirés au lot 7, à la bascule).
-- REJOUABLE : ne crée aucun doublon, n'écrase pas les bornes
-- de périodes déjà saisies par l'admin.
-- Tout est dans une transaction : si le contrôle final échoue,
-- rien n'est appliqué.
-- ============================================================

BEGIN;

-- ── Périodes ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.periodes (
  id      INTEGER PRIMARY KEY CHECK (id BETWEEN 1 AND 4),
  label   TEXT NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,   -- fin de la période ; le début est la fin de la précédente
  scored  JSONB NOT NULL          -- pronostics ouverts et scorés
);

-- Bornes PROVISOIRES (heure de Paris), modifiables par l'admin.
-- ON CONFLICT DO NOTHING : un rejeu ne remet pas ces valeurs.
INSERT INTO public.periodes (id, label, ends_at, scored) VALUES
  (1, 'Un an avant',          timestamptz '2026-09-01 00:00 Europe/Paris', '["m1","m2","m3","m4","m5"]'),
  (2, 'La pré-campagne',      timestamptz '2027-03-15 00:00 Europe/Paris', '["m1","m2","m3","m4","m5"]'),
  (3, 'La campagne',          timestamptz '2027-04-11 00:00 Europe/Paris', '["m2","m3","m4","m5"]'),
  (4, 'L''entre-deux-tours',  timestamptz '2027-04-25 00:00 Europe/Paris', '["m4","m5"]')
ON CONFLICT (id) DO NOTHING;

-- ── Paris ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.paris (
  id                   BIGSERIAL PRIMARY KEY,
  player_id            TEXT NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  periode              INTEGER NOT NULL REFERENCES public.periodes(id),
  m1                   JSONB NOT NULL DEFAULT '[]',   -- string[]
  m2                   JSONB NOT NULL DEFAULT '{}',   -- { [candidat]: number }
  m3                   JSONB NOT NULL DEFAULT '[]',   -- string[] (max 2)
  m4                   TEXT NOT NULL DEFAULT '',
  m5                   NUMERIC(5,1) DEFAULT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  legacy_pronostic_id  BIGINT
);

CREATE UNIQUE INDEX IF NOT EXISTS paris_legacy_unique
  ON public.paris (legacy_pronostic_id) WHERE legacy_pronostic_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_paris_player  ON public.paris (player_id, created_at);
CREATE INDEX IF NOT EXISTS idx_paris_periode ON public.paris (periode);

-- ── Lecture publique uniquement ───────────────────────────────
ALTER TABLE public.periodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paris    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "periodes_read" ON public.periodes;
CREATE POLICY "periodes_read" ON public.periodes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "paris_read" ON public.paris;
CREATE POLICY "paris_read" ON public.paris FOR SELECT TO anon, authenticated USING (true);

REVOKE ALL ON public.periodes, public.paris FROM anon, authenticated;
GRANT SELECT ON public.periodes, public.paris TO anon, authenticated;
REVOKE ALL ON SEQUENCE public.paris_id_seq FROM anon, authenticated;

-- ── Helpers privés ────────────────────────────────────────────

-- Période en cours : la première dont la fin n'est pas passée. NULL = jeu fermé.
CREATE OR REPLACE FUNCTION private.periode_courante()
RETURNS INTEGER LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT min(id) FROM public.periodes WHERE ends_at > now();
$$;

-- Valide un pari et ne garde que les pronostics ouverts dans la période
-- (les autres sont remis à vide). Renvoie les valeurs nettoyées.
CREATE OR REPLACE FUNCTION private.clean_pari(
  p_periode INTEGER,
  p_m1 JSONB, p_m2 JSONB, p_m3 JSONB, p_m4 TEXT, p_m5 NUMERIC
) RETURNS JSONB LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE
  sc JSONB;
  m1 JSONB := coalesce(p_m1, '[]');
  m2 JSONB := coalesce(p_m2, '{}');
  m3 JSONB := coalesce(p_m3, '[]');
  m4 TEXT  := coalesce(p_m4, '');
  m5 NUMERIC := p_m5;
  official JSONB;
BEGIN
  SELECT scored INTO sc FROM public.periodes WHERE id = p_periode;

  -- Garde-fous de taille / format (identiques à save_pronostic)
  IF jsonb_typeof(m1) <> 'array' OR jsonb_array_length(m1) > 40
     OR jsonb_typeof(m2) <> 'object' OR length(m2::text) > 5000
     OR jsonb_typeof(m3) <> 'array' OR jsonb_array_length(m3) > 2
     OR length(m4) > 100
     OR (m5 IS NOT NULL AND (m5 < 0 OR m5 > 100)) THEN
    RAISE EXCEPTION 'Pari invalide';
  END IF;

  -- Pronostics fermés dans cette période : remis à vide
  IF NOT sc ? 'm1' THEN m1 := '[]'; END IF;
  IF NOT sc ? 'm2' THEN m2 := '{}'; END IF;
  IF NOT sc ? 'm3' THEN m3 := '[]'; END IF;
  IF NOT sc ? 'm4' THEN m4 := ''; END IF;
  IF NOT sc ? 'm5' THEN m5 := NULL; END IF;

  -- Dès que la liste officielle est connue (période 3+), les scores
  -- ne portent que sur des candidats officiels.
  IF p_periode >= 3 AND sc ? 'm2' THEN
    SELECT official_candidates_r1 INTO official FROM public.game_state WHERE id = 1;
    IF jsonb_array_length(coalesce(official, '[]')) = 0 THEN
      RAISE EXCEPTION 'La liste officielle des candidats n''est pas encore saisie';
    END IF;
    IF EXISTS (
      SELECT 1 FROM jsonb_object_keys(m2) k
       WHERE NOT (official @> to_jsonb(k))
    ) THEN
      RAISE EXCEPTION 'Candidat hors liste officielle';
    END IF;
  END IF;

  RETURN jsonb_build_object('m1', m1, 'm2', m2, 'm3', m3, 'm4', m4, 'm5', m5);
END $$;

-- ── API publique : joueurs ────────────────────────────────────

-- Pose un nouveau pari (la période est décidée par le serveur).
-- Retourne 'ok', 'bad_code', 'locked', 'no_code' ou 'closed'.
CREATE OR REPLACE FUNCTION public.create_pari(
  p_player_id TEXT, p_code TEXT,
  p_m1 JSONB, p_m2 JSONB, p_m3 JSONB, p_m4 TEXT, p_m5 NUMERIC
) RETURNS TEXT LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE status TEXT; per INTEGER; c JSONB;
BEGIN
  status := private.check_player_code(p_player_id, p_code);
  IF status <> 'ok' THEN RETURN status; END IF;

  per := private.periode_courante();
  IF per IS NULL THEN RETURN 'closed'; END IF;

  c := private.clean_pari(per, p_m1, p_m2, p_m3, p_m4, p_m5);
  INSERT INTO public.paris (player_id, periode, m1, m2, m3, m4, m5)
  VALUES (p_player_id, per, c->'m1', c->'m2', c->'m3', c->>'m4', (c->>'m5')::numeric);
  RETURN 'ok';
END $$;

-- Corrige un pari : moins de 24 h ET période du pari encore en cours.
-- Retourne 'ok', 'bad_code', 'locked', 'no_code', 'not_found', 'expired' ou 'period_closed'.
CREATE OR REPLACE FUNCTION public.update_pari(
  p_pari_id BIGINT, p_player_id TEXT, p_code TEXT,
  p_m1 JSONB, p_m2 JSONB, p_m3 JSONB, p_m4 TEXT, p_m5 NUMERIC
) RETURNS TEXT LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE status TEXT; pr public.paris%ROWTYPE; c JSONB;
BEGIN
  status := private.check_player_code(p_player_id, p_code);
  IF status <> 'ok' THEN RETURN status; END IF;

  SELECT * INTO pr FROM public.paris WHERE id = p_pari_id AND player_id = p_player_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF pr.created_at <= now() - interval '24 hours' THEN RETURN 'expired'; END IF;
  IF pr.periode IS DISTINCT FROM private.periode_courante() THEN RETURN 'period_closed'; END IF;

  c := private.clean_pari(pr.periode, p_m1, p_m2, p_m3, p_m4, p_m5);
  UPDATE public.paris
     SET m1 = c->'m1', m2 = c->'m2', m3 = c->'m3', m4 = c->>'m4',
         m5 = (c->>'m5')::numeric, updated_at = now()
   WHERE id = p_pari_id;
  RETURN 'ok';
END $$;

-- ── API admin ─────────────────────────────────────────────────

-- Bornes des périodes : tableau de 4 objets { id, label, ends_at }, dates strictement croissantes.
CREATE OR REPLACE FUNCTION public.admin_save_periodes(p_pin TEXT, p_periodes JSONB)
RETURNS VOID LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE e JSONB; prev TIMESTAMPTZ := '-infinity'; cur TIMESTAMPTZ; i INTEGER := 0;
BEGIN
  PERFORM private.assert_admin(p_pin);
  IF jsonb_typeof(p_periodes) <> 'array' OR jsonb_array_length(p_periodes) <> 4 THEN
    RAISE EXCEPTION 'Il faut exactement 4 périodes';
  END IF;
  FOR e IN SELECT * FROM jsonb_array_elements(p_periodes) LOOP
    i := i + 1;
    IF (e->>'id')::int <> i THEN RAISE EXCEPTION 'Périodes à fournir dans l''ordre 1 à 4'; END IF;
    cur := (e->>'ends_at')::timestamptz;
    IF cur <= prev THEN RAISE EXCEPTION 'Les dates de fin doivent être croissantes'; END IF;
    IF length(btrim(coalesce(e->>'label', ''))) = 0 THEN RAISE EXCEPTION 'Nom de période vide'; END IF;
    prev := cur;
  END LOOP;
  FOR e IN SELECT * FROM jsonb_array_elements(p_periodes) LOOP
    UPDATE public.periodes
       SET label = btrim(e->>'label'), ends_at = (e->>'ends_at')::timestamptz
     WHERE id = (e->>'id')::int;
  END LOOP;
END $$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon, authenticated;

-- ── Reprise des données ───────────────────────────────────────
-- Les pronostics de phase 1 deviennent des paris de période 1, datés de
-- leur dernière modification (donc figés d'office). Rejouable.
INSERT INTO public.paris (player_id, periode, m1, m2, m3, m4, m5, created_at, updated_at, legacy_pronostic_id)
SELECT p.player_id, 1, p.m1, p.m2, p.m3, p.m4, p.m5, p.updated_at, p.updated_at, p.id
  FROM public.pronostics p
 WHERE p.session = 1
ON CONFLICT (legacy_pronostic_id) WHERE legacy_pronostic_id IS NOT NULL DO NOTHING;

-- ── Contrôle : si un seul point échoue, tout est annulé ──────
DO $$
DECLARE n_src INTEGER; n_ok INTEGER; n_autres INTEGER;
BEGIN
  SELECT count(*) INTO n_autres FROM public.pronostics WHERE session <> 1;
  IF n_autres > 0 THEN
    RAISE EXCEPTION 'Contrôle : % pronostic(s) de session 2 ou 3 non repris par cette migration', n_autres;
  END IF;

  SELECT count(*) INTO n_src FROM public.pronostics WHERE session = 1;
  SELECT count(*) INTO n_ok
    FROM public.pronostics p
    JOIN public.paris a ON a.legacy_pronostic_id = p.id
   WHERE p.session = 1
     AND a.player_id = p.player_id AND a.periode = 1
     AND a.m1 = p.m1 AND a.m2 = p.m2 AND a.m3 = p.m3
     AND a.m4 = p.m4 AND a.m5 IS NOT DISTINCT FROM p.m5
     AND a.created_at = p.updated_at AND a.updated_at = p.updated_at;
  IF n_ok <> n_src THEN
    RAISE EXCEPTION 'Contrôle : % pari(s) migré(s) conformes sur % attendus', n_ok, n_src;
  END IF;
  RAISE NOTICE 'Contrôle OK : % pari(s) migré(s), contenus identiques', n_ok;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;

SELECT (SELECT count(*) FROM public.paris) AS paris,
       (SELECT count(*) FROM public.pronostics) AS pronostics,
       (SELECT count(*) FROM public.periodes) AS periodes;

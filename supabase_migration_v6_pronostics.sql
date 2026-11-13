-- ============================================================
-- Migration v6 — Pivot « pronostics » : pseudo libre, sans code ni période
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- D'abord sur la base de TEST, puis sur la production à la bascule
-- (après une sauvegarde JSON des tables).
--
-- ADDITIVE : aucune ligne supprimée, aucune colonne retirée.
-- Les anciennes fonctions (create_pari, update_pari, codes…) restent
-- en place : le site en production continue de fonctionner.
-- REJOUABLE. Tout est dans une transaction.
-- ============================================================

BEGIN;

-- ── Colonnes ──────────────────────────────────────────────────
ALTER TABLE public.paris ADD COLUMN IF NOT EXISTS pseudo TEXT;
ALTER TABLE public.paris ADD COLUMN IF NOT EXISTS masque BOOLEAN NOT NULL DEFAULT false;

-- Les nouveaux pronostics n'ont ni joueur ni période
ALTER TABLE public.paris ALTER COLUMN player_id DROP NOT NULL;
ALTER TABLE public.paris ALTER COLUMN periode   DROP NOT NULL;

-- Les paris existants prennent le nom de leur joueur comme pseudo (seulement s'il est vide)
UPDATE public.paris a
   SET pseudo = p.name
  FROM public.players p
 WHERE a.player_id = p.id AND a.pseudo IS NULL;

CREATE INDEX IF NOT EXISTS idx_paris_created ON public.paris (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_paris_pseudo  ON public.paris (lower(pseudo), created_at DESC);

-- ── Lecture publique : seulement les pronostics non masqués ───
DROP POLICY IF EXISTS "paris_read" ON public.paris;
CREATE POLICY "paris_read" ON public.paris FOR SELECT TO anon, authenticated USING (NOT masque);

-- ── API publique ──────────────────────────────────────────────
-- Enregistre un pronostic complet (les deux tours). Renvoie son id.
--   p_m2 : { candidat: pourcentage } du 1er tour, total 100 % (± 0,15)
--   p_m3 : les deux finalistes, qui doivent être les deux premiers de p_m2
--   p_m4 : le vainqueur (l'un des deux finalistes)
--   p_m5 : son score au 2nd tour, plus de 50 % et au plus 100 %
-- m1 (la liste des candidats) est déduite de p_m2, du plus haut au plus bas.
CREATE OR REPLACE FUNCTION public.create_pronostic(
  p_pseudo TEXT, p_m2 JSONB, p_m3 JSONB, p_m4 TEXT, p_m5 NUMERIC
) RETURNS BIGINT LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_pseudo TEXT := btrim(coalesce(p_pseudo, ''));
  v_m1 JSONB;
  total NUMERIC;
  n INTEGER;
  f1 TEXT; f2 TEXT;
  plus_bas_finaliste NUMERIC;
  plus_haut_autre NUMERIC;
  nouvel_id BIGINT;
BEGIN
  -- Pseudo
  IF length(v_pseudo) = 0 THEN RAISE EXCEPTION 'Indique ton pseudo.'; END IF;
  IF length(v_pseudo) > 30 THEN RAISE EXCEPTION 'Pseudo trop long (30 caractères au plus).'; END IF;

  -- Anti-rafale : un pronostic par pseudo et par minute, 120 par heure en tout
  IF EXISTS (SELECT 1 FROM public.paris p
              WHERE lower(p.pseudo) = lower(v_pseudo)
                AND p.created_at > now() - interval '1 minute') THEN
    RAISE EXCEPTION 'Tu viens déjà de poster un pronostic : attends une minute.';
  END IF;
  IF (SELECT count(*) FROM public.paris WHERE created_at > now() - interval '1 hour') >= 120 THEN
    RAISE EXCEPTION 'Trop de pronostics en ce moment : réessaie dans un moment.';
  END IF;

  -- 1er tour
  IF p_m2 IS NULL OR jsonb_typeof(p_m2) <> 'object' THEN RAISE EXCEPTION 'Pronostic du 1er tour invalide.'; END IF;
  SELECT count(*) INTO n FROM jsonb_each(p_m2);
  IF n < 2 OR n > 40 THEN RAISE EXCEPTION 'Il faut entre 2 et 40 candidats au 1er tour.'; END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_each(p_m2) e
     WHERE length(btrim(e.key)) = 0 OR length(e.key) > 60
        OR coalesce(CASE WHEN jsonb_typeof(e.value) = 'number' THEN (e.value)::text::numeric END, 0) <= 0
        OR coalesce(CASE WHEN jsonb_typeof(e.value) = 'number' THEN (e.value)::text::numeric END, 0) > 100
  ) THEN
    RAISE EXCEPTION 'Chaque candidat doit avoir un nom et un pourcentage entre 0 et 100.';
  END IF;
  SELECT sum((e.value)::text::numeric) INTO total FROM jsonb_each(p_m2) e;
  IF abs(total - 100) > 0.15 THEN RAISE EXCEPTION 'Le total du 1er tour doit faire 100 %%.'; END IF;

  -- 2nd tour : les deux finalistes sont les deux premiers du 1er tour
  IF p_m3 IS NULL OR jsonb_typeof(p_m3) <> 'array' OR jsonb_array_length(p_m3) <> 2 THEN
    RAISE EXCEPTION 'Il faut deux finalistes.';
  END IF;
  f1 := p_m3->>0; f2 := p_m3->>1;
  IF f1 IS NULL OR f2 IS NULL OR f1 = f2 OR NOT (p_m2 ? f1) OR NOT (p_m2 ? f2) THEN
    RAISE EXCEPTION 'Les finalistes doivent être deux candidats du 1er tour.';
  END IF;
  plus_bas_finaliste := least((p_m2->>f1)::numeric, (p_m2->>f2)::numeric);
  SELECT max((e.value)::text::numeric) INTO plus_haut_autre
    FROM jsonb_each(p_m2) e WHERE e.key NOT IN (f1, f2);
  IF plus_haut_autre IS NOT NULL AND plus_haut_autre > plus_bas_finaliste THEN
    RAISE EXCEPTION 'Les finalistes doivent être les deux premiers du 1er tour.';
  END IF;
  IF p_m4 IS NULL OR p_m4 NOT IN (f1, f2) THEN RAISE EXCEPTION 'Le vainqueur doit être l''un des deux finalistes.'; END IF;
  IF p_m5 IS NULL OR p_m5 <= 50 OR p_m5 > 100 THEN RAISE EXCEPTION 'Le vainqueur doit avoir plus de 50 %%.'; END IF;

  -- Liste des candidats, du plus haut au plus bas
  SELECT jsonb_agg(e.key ORDER BY (e.value)::text::numeric DESC, e.key) INTO v_m1 FROM jsonb_each(p_m2) e;

  INSERT INTO public.paris (pseudo, m1, m2, m3, m4, m5)
  VALUES (v_pseudo, v_m1, p_m2, p_m3, p_m4, round(p_m5, 1))
  RETURNING id INTO nouvel_id;
  RETURN nouvel_id;
END $$;

-- ── API admin ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_set_masque(p_pin TEXT, p_id BIGINT, p_masque BOOLEAN)
RETURNS VOID LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM private.assert_admin(p_pin);
  UPDATE public.paris SET masque = coalesce(p_masque, false) WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pronostic introuvable.'; END IF;
END $$;

-- Les pronostics masqués (invisibles pour le public), pour pouvoir les réafficher.
CREATE OR REPLACE FUNCTION public.admin_paris_masques(p_pin TEXT)
RETURNS SETOF public.paris LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM private.assert_admin(p_pin);
  RETURN QUERY SELECT * FROM public.paris WHERE masque ORDER BY created_at DESC;
END $$;

-- ── Contrôle : si un point échoue, tout est annulé ────────────
DO $$
DECLARE sans_pseudo INTEGER;
BEGIN
  SELECT count(*) INTO sans_pseudo FROM public.paris WHERE pseudo IS NULL OR btrim(pseudo) = '';
  IF sans_pseudo > 0 THEN
    RAISE EXCEPTION 'Contrôle : % pari(s) sans pseudo', sans_pseudo;
  END IF;
  RAISE NOTICE 'Contrôle OK : tous les paris ont un pseudo';
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;

SELECT id, pseudo, masque, created_at FROM public.paris ORDER BY created_at;

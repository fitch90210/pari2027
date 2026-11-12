-- ============================================================
-- Tests de la migration v4 — À JOUER SUR LA BASE DE TEST UNIQUEMENT
-- (SQL Editor). Tout est annulé en fin de script (ROLLBACK) :
-- aucune donnée n'est conservée. Un test qui échoue lève une exception.
-- Ne contient aucun secret : le joueur et son code sont créés ici.
-- ============================================================

BEGIN;

DO $$
DECLARE
  pid TEXT; r TEXT; pari BIGINT; per INT; old_ends TIMESTAMPTZ[];
  nb INT; v JSONB;
  tout JSONB := '{"A":50,"B":50}';
BEGIN
  PERFORM public.create_player('zz_test_v4', '1234');
  SELECT id INTO pid FROM public.players WHERE name = 'zz_test_v4';

  -- Rend le test indépendant de la date du jour : période 2 en cours.
  UPDATE public.periodes SET ends_at = CASE id
    WHEN 1 THEN now() - interval '10 days'
    WHEN 2 THEN now() + interval '10 days'
    WHEN 3 THEN now() + interval '20 days'
    ELSE now() + interval '30 days' END;
  UPDATE public.game_state SET official_candidates_r1 = '["A","B","C"]' WHERE id = 1;

  -- 1. Mauvais code
  r := public.create_pari(pid, '0000', '["A","B"]', tout, '["A","B"]', 'A', 55);
  IF r <> 'bad_code' THEN RAISE EXCEPTION 'T1 attendu bad_code, obtenu %', r; END IF;

  -- 2. Création en période 2 : tout est conservé
  r := public.create_pari(pid, '1234', '["A","B"]', tout, '["A","B"]', 'A', 55);
  IF r <> 'ok' THEN RAISE EXCEPTION 'T2 création : %', r; END IF;
  SELECT id, periode INTO pari, per FROM public.paris WHERE player_id = pid;
  IF per <> 2 THEN RAISE EXCEPTION 'T2 période % au lieu de 2', per; END IF;

  -- 3. Correction dans les 24 h
  r := public.update_pari(pari, pid, '1234', '["A","B","C"]', tout, '["A","B"]', 'B', 52);
  IF r <> 'ok' THEN RAISE EXCEPTION 'T3 update : %', r; END IF;
  IF (SELECT m4 FROM public.paris WHERE id = pari) <> 'B' THEN RAISE EXCEPTION 'T3 valeur non mise à jour'; END IF;

  -- 4. Pari d'un autre joueur : introuvable
  r := public.update_pari(pari, 'inconnu', '1234', '[]', '{}', '[]', '', NULL);
  IF r NOT IN ('no_code', 'not_found') THEN RAISE EXCEPTION 'T4 : %', r; END IF;

  -- 5. Plus de 24 h : expiré
  UPDATE public.paris SET created_at = now() - interval '25 hours' WHERE id = pari;
  r := public.update_pari(pari, pid, '1234', '[]', '{}', '[]', 'A', 50);
  IF r <> 'expired' THEN RAISE EXCEPTION 'T5 attendu expired, obtenu %', r; END IF;

  -- 6. Période close (pari de moins de 24 h mais période terminée) : refus
  UPDATE public.paris SET created_at = now() WHERE id = pari;
  UPDATE public.periodes SET ends_at = now() - interval '1 hour' WHERE id = 2;
  r := public.update_pari(pari, pid, '1234', '[]', '{}', '[]', 'A', 50);
  IF r <> 'period_closed' THEN RAISE EXCEPTION 'T6 attendu period_closed, obtenu %', r; END IF;

  -- 7. Période 3 : m1 ignoré (vidé), candidat hors liste refusé
  r := public.create_pari(pid, '1234', '["A","B"]', '{"A":60,"C":40}', '["A","C"]', 'A', 55);
  IF r <> 'ok' THEN RAISE EXCEPTION 'T7 création P3 : %', r; END IF;
  SELECT m1 INTO v FROM public.paris WHERE player_id = pid ORDER BY id DESC LIMIT 1;
  IF v <> '[]' THEN RAISE EXCEPTION 'T7 m1 aurait dû être vidé : %', v; END IF;
  BEGIN
    PERFORM public.create_pari(pid, '1234', '[]', '{"Z":100}', '[]', 'A', 55);
    RAISE EXCEPTION 'T7 ECHEC : candidat inconnu accepté';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%hors liste%' THEN RAISE; END IF;
  END;

  -- 8. Période 4 : seuls m4 et m5 sont gardés
  UPDATE public.periodes SET ends_at = now() - interval '1 hour' WHERE id = 3;
  r := public.create_pari(pid, '1234', '["A"]', '{"A":100}', '["A","B"]', 'A', 55);
  SELECT count(*) INTO nb FROM public.paris WHERE player_id = pid AND periode = 4 AND m2 = '{}' AND m3 = '[]' AND m4 = 'A' AND m5 = 55;
  IF r <> 'ok' OR nb <> 1 THEN RAISE EXCEPTION 'T8 période 4 : % / %', r, nb; END IF;

  -- 9. Jeu fermé après la période 4
  UPDATE public.periodes SET ends_at = now() - interval '1 minute' WHERE id = 4;
  r := public.create_pari(pid, '1234', '[]', '{}', '[]', 'A', 55);
  IF r <> 'closed' THEN RAISE EXCEPTION 'T9 attendu closed, obtenu %', r; END IF;

  -- 10. Format invalide
  UPDATE public.periodes SET ends_at = now() + interval '5 days' WHERE id = 4;
  BEGIN
    PERFORM public.create_pari(pid, '1234', '[]', '{}', '[]', 'A', 150);
    RAISE EXCEPTION 'T10 m5 = 150 accepté';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%invalide%' THEN RAISE; END IF;
  END;

  RAISE NOTICE 'Tous les tests de la v4 passent (10/10)';
END $$;

ROLLBACK;

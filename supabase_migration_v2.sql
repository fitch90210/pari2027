-- ============================================================
-- Migration v2 — Jeu de Paris 2027
-- Ajouter les colonnes candidats officiels + support S3
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- ============================================================

-- Nouvelles colonnes dans game_state
ALTER TABLE game_state
  ADD COLUMN IF NOT EXISTS official_candidates_r1 JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS official_finalists      JSONB NOT NULL DEFAULT '[]';

-- Étendre la contrainte session dans pronostics pour accepter S3
ALTER TABLE pronostics DROP CONSTRAINT IF EXISTS pronostics_session_check;
ALTER TABLE pronostics ADD CONSTRAINT pronostics_session_check
  CHECK (session IN (1, 2, 3));

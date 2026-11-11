-- ============================================================
-- Jeu de Paris 2027 — Schéma Supabase
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- ============================================================

-- Table : état global de la session
CREATE TABLE IF NOT EXISTS game_state (
  id       INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- singleton
  session  INTEGER NOT NULL DEFAULT 1 CHECK (session IN (1, 2, 3)),
  results  JSONB DEFAULT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO game_state (id, session) VALUES (1, 1)
ON CONFLICT (id) DO NOTHING;

-- Table : joueurs
CREATE TABLE IF NOT EXISTS players (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table : pronostics (une ligne par joueur × session)
CREATE TABLE IF NOT EXISTS pronostics (
  id         BIGSERIAL PRIMARY KEY,
  player_id  TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  session    INTEGER NOT NULL CHECK (session IN (1, 2)),
  m1         JSONB NOT NULL DEFAULT '[]',   -- string[]
  m2         JSONB NOT NULL DEFAULT '{}',   -- { [candidat]: number }
  m3         JSONB NOT NULL DEFAULT '[]',   -- string[] (max 2)
  m4         TEXT NOT NULL DEFAULT '',      -- vainqueur prédit
  m5         NUMERIC(5,1) DEFAULT NULL,     -- score 2nd tour prédit
  locked_at  TIMESTAMPTZ DEFAULT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (player_id, session)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_pronostics_player ON pronostics(player_id);
CREATE INDEX IF NOT EXISTS idx_pronostics_session ON pronostics(session);

-- ============================================================
-- RLS (Row Level Security) — accès public en lecture/écriture
-- (pas d'auth stricte, le groupe est de confiance)
-- ============================================================
ALTER TABLE game_state  ENABLE ROW LEVEL SECURITY;
ALTER TABLE players     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pronostics  ENABLE ROW LEVEL SECURITY;

-- game_state : lecture publique, écriture interdite côté client (via service role uniquement)
CREATE POLICY "game_state_read"  ON game_state  FOR SELECT USING (true);
CREATE POLICY "game_state_write" ON game_state  FOR ALL    USING (true); -- restreindre si besoin

-- players : lecture publique, insertion publique (auto-inscription)
CREATE POLICY "players_read"   ON players FOR SELECT USING (true);
CREATE POLICY "players_insert" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "players_delete" ON players FOR DELETE USING (true);

-- pronostics : lecture publique, écriture par tous (pas d'auth)
CREATE POLICY "pronostics_read"   ON pronostics FOR SELECT USING (true);
CREATE POLICY "pronostics_insert" ON pronostics FOR INSERT WITH CHECK (true);
CREATE POLICY "pronostics_update" ON pronostics FOR UPDATE USING (true);
CREATE POLICY "pronostics_delete" ON pronostics FOR DELETE USING (true);

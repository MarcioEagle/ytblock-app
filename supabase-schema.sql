-- =============================================
-- YTBLOCK - Schema Supabase (PostgreSQL)
-- Execute no SQL Editor do Supabase
-- =============================================

-- Tabela de perfis dos usuários
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT UNIQUE NOT NULL,
  name        TEXT,
  plan        TEXT DEFAULT 'pro',
  status      TEXT DEFAULT 'inactive', -- 'active' | 'inactive'
  ads_blocked BIGINT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS (Row Level Security) - cada usuário vê só o próprio perfil
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê só seu perfil"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Usuário atualiza só seu perfil"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Service Role pode fazer tudo (usado pelo servidor Node.js)
CREATE POLICY "Service role acesso total"
  ON profiles FOR ALL
  USING (auth.role() = 'service_role');

-- Index para busca por email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

-- =============================================
-- COMO USAR:
-- 1. Acesse https://supabase.com > seu projeto
-- 2. Vá em "SQL Editor"
-- 3. Cole este script e clique em "Run"
-- =============================================

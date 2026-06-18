-- ElevenLabs upgrade migration
-- Run this in Supabase SQL Editor after the original schema.sql

CREATE TABLE IF NOT EXISTS elevenlabs_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid REFERENCES callers(id),
  elevenlabs_conversation_id text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_turns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid REFERENCES callers(id),
  elevenlabs_session_id uuid REFERENCES elevenlabs_sessions(id),
  role text NOT NULL,
  content text NOT NULL,
  channel text DEFAULT 'elevenlabs',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS last_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid REFERENCES callers(id),
  resource_index integer NOT NULL,
  name text,
  phone text,
  address text,
  description text,
  url text,
  score numeric,
  category text,
  zip_code text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT last_resources_caller_index_unique UNIQUE (caller_id, resource_index)
);

CREATE TRIGGER update_elevenlabs_sessions_updated_at
  BEFORE UPDATE ON elevenlabs_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

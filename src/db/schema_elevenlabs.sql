CREATE TABLE IF NOT EXISTS elevenlabs_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid REFERENCES callers(id),
  elevenlabs_conversation_id text,
  from_phone text,
  status text DEFAULT 'active',
  detected_category text,
  zip_code text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_turns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid REFERENCES callers(id),
  elevenlabs_session_id uuid REFERENCES elevenlabs_sessions(id),
  role text,
  content text,
  channel text DEFAULT 'elevenlabs',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS last_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid REFERENCES callers(id),
  resource_index integer,
  name text,
  phone text,
  address text,
  description text,
  url text,
  score numeric,
  category text,
  zip_code text,
  created_at timestamptz DEFAULT now()
);

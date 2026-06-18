-- Community Hotline Database Schema

CREATE TABLE IF NOT EXISTS callers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE NOT NULL,
  zip_code text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid REFERENCES callers(id),
  twilio_call_sid text,
  from_phone text,
  to_phone text,
  detected_category text,
  zip_code text,
  status text DEFAULT 'started',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_session_id uuid REFERENCES call_sessions(id),
  role text,
  channel text,
  content text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS live_search_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_session_id uuid REFERENCES call_sessions(id),
  query text,
  title text,
  url text,
  snippet text,
  extracted_name text,
  extracted_phone text,
  extracted_address text,
  extracted_website text,
  extracted_description text,
  source_domain text,
  confidence_score numeric,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid REFERENCES callers(id),
  call_session_id uuid REFERENCES call_sessions(id),
  resource_title text,
  resource_url text,
  resource_phone text,
  resource_address text,
  status text DEFAULT 'sent',
  created_at timestamptz DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_callers_updated_at
  BEFORE UPDATE ON callers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_call_sessions_updated_at
  BEFORE UPDATE ON call_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS guba_workspace (
  id text PRIMARY KEY CHECK (id = 'guba'),
  revision integer NOT NULL DEFAULT 0,
  settings jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO guba_workspace (id, settings) VALUES ('guba', '{"siteName":"GUBA Engineering Investment Group","contactEmail":"hello@gubaengineering.com","maintenance":false}') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS guba_records (
  section text NOT NULL,
  id text NOT NULL,
  data jsonb NOT NULL,
  position integer NOT NULL DEFAULT 0,
  PRIMARY KEY (section, id)
);
CREATE INDEX IF NOT EXISTS guba_records_section ON guba_records(section, position);
CREATE TABLE IF NOT EXISTS guba_activity (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor text NOT NULL,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS guba_admin_users (
  email text PRIMARY KEY,
  name text NOT NULL,
  password_hash text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS guba_admin_sessions (
  token_hash text PRIMARY KEY,
  email text NOT NULL REFERENCES guba_admin_users(email) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS guba_admin_sessions_expiry ON guba_admin_sessions(expires_at);
CREATE TABLE IF NOT EXISTS guba_login_attempts (
  email text PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS guba_submission_limits (
  key text PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS guba_migrations (
  id text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guba_images (
  id uuid PRIMARY KEY,
  data bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

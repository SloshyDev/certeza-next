CREATE TABLE IF NOT EXISTS users_auth (
  id SERIAL PRIMARY KEY,
  name TEXT,
  email TEXT NOT NULL UNIQUE,
  external_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


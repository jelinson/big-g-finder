-- Run this in the Supabase SQL editor to set up the schema and seed data.

-- Static location reference
CREATE TABLE locations (
  slug    TEXT PRIMARY KEY,
  name    TEXT NOT NULL,
  url     TEXT NOT NULL,
  address TEXT,
  active  BOOLEAN NOT NULL DEFAULT TRUE
);

-- If the table already exists, add the active column:
-- ALTER TABLE locations ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

-- Flavor inventory, upserted daily
CREATE TABLE flavors (
  id          SERIAL PRIMARY KEY,
  location    TEXT NOT NULL REFERENCES locations(slug),
  flavor_name TEXT NOT NULL,
  first_seen  DATE NOT NULL DEFAULT CURRENT_DATE,
  last_seen   DATE NOT NULL DEFAULT CURRENT_DATE,
  notified    BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(location, flavor_name)
);

-- If the table already exists, add the notified column:
-- ALTER TABLE flavors ADD COLUMN IF NOT EXISTS notified BOOLEAN NOT NULL DEFAULT FALSE;

-- Email subscriptions
CREATE TABLE subscriptions (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  email             TEXT    NOT NULL,
  flavor_pattern    TEXT    NOT NULL,
  flavor_name       TEXT,
  locations         TEXT[],
  confirmed         BOOLEAN NOT NULL DEFAULT FALSE,
  confirm_token     TEXT    UNIQUE DEFAULT gen_random_uuid()::TEXT,
  unsubscribe_token TEXT    UNIQUE DEFAULT gen_random_uuid()::TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- If the table already exists, add the column:
-- ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS flavor_name TEXT;

-- Row Level Security (all access goes through the service role key, which bypasses RLS;
-- these block any anon/authenticated-role access as a fail-safe)
ALTER TABLE locations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE flavors       ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Seed locations
INSERT INTO locations (slug, name, url, address) VALUES
  ('south-boulder',       'South Boulder',       'https://sweetcow.com/south-boulder/',        '669 South Broadway, Boulder'),
  ('north-boulder',       'North Boulder',       'https://sweetcow.com/north-boulder/',        '2628 Broadway, Boulder'),
  ('louisville',          'Louisville',          'https://sweetcow.com/louisville/',           '637 Front Street, Louisville'),
  ('longmont',            'Longmont',            'https://sweetcow.com/longmont/',             '600 Longs Peak Ave, Longmont'),
  ('highlands',           'Highlands',           'https://sweetcow.com/highlands/',            '3475 West 32nd Ave, Denver'),
  ('stanley-marketplace', 'Stanley Marketplace', 'https://sweetcow.com/stanley-marketplace/', '2501 Dallas Street, Aurora'),
  ('platt-park',          'Platt Park',          'https://sweetcow.com/denver-platt-park/',   '1882 South Pearl St, Denver');

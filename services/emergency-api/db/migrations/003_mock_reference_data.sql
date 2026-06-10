CREATE TABLE IF NOT EXISTS emergency_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  bg_color TEXT NOT NULL,
  recommended_agency TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provinces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS districts (
  id TEXT PRIMARY KEY,
  province_id TEXT NOT NULL REFERENCES provinces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (province_id, name)
);

CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  notifications BOOLEAN NOT NULL DEFAULT true,
  offline_mode BOOLEAN NOT NULL DEFAULT false,
  dark_mode BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  relationship TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_emergency_contacts_user_id_idx
  ON user_emergency_contacts(user_id);

CREATE TABLE IF NOT EXISTS dashboard_snapshots (
  id TEXT PRIMARY KEY,
  total_calls_today INTEGER NOT NULL DEFAULT 0,
  active_incidents INTEGER NOT NULL DEFAULT 0,
  total_agencies INTEGER NOT NULL DEFAULT 0,
  avg_response_time NUMERIC(6, 2) NOT NULL DEFAULT 0,
  calls_by_category JSONB NOT NULL DEFAULT '{}'::jsonb,
  calls_by_province JSONB NOT NULL DEFAULT '{}'::jsonb,
  success_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE incidents ADD COLUMN IF NOT EXISTS agency_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS province TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS accuracy INTEGER;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS call_status TEXT;

CREATE INDEX IF NOT EXISTS incidents_agency_contact_id_idx
  ON incidents(agency_contact_id);

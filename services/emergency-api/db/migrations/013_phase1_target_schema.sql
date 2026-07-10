-- Migration 013: Phase 1 target schema ของ production data model
-- กระทบ incidents/contacts/areas หลัก ถ้าแก้ต้องทดสอบ API route suite และ db-reset

CREATE TABLE IF NOT EXISTS agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_id TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agencies_category_fk'
  ) THEN
    ALTER TABLE agencies
      ADD CONSTRAINT agencies_category_fk
      FOREIGN KEY (category_id) REFERENCES emergency_categories(id)
      ON DELETE RESTRICT
      NOT VALID;
  END IF;
END $$;

ALTER TABLE agencies
  VALIDATE CONSTRAINT agencies_category_fk;

CREATE INDEX IF NOT EXISTS agencies_category_active_idx
  ON agencies (category_id, active);

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jwt_subject TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  agency_id UUID,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'admin_users_role_check'
  ) THEN
    ALTER TABLE admin_users
      ADD CONSTRAINT admin_users_role_check
      CHECK (role IN ('super_admin', 'agency_admin'))
      NOT VALID;
  END IF;
END $$;

ALTER TABLE admin_users
  VALIDATE CONSTRAINT admin_users_role_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'admin_users_agency_fk'
  ) THEN
    ALTER TABLE admin_users
      ADD CONSTRAINT admin_users_agency_fk
      FOREIGN KEY (agency_id) REFERENCES agencies(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

ALTER TABLE admin_users
  VALIDATE CONSTRAINT admin_users_agency_fk;

CREATE INDEX IF NOT EXISTS admin_users_jwt_subject_active_idx
  ON admin_users (jwt_subject, active);

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS agency_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'contacts_agency_fk'
  ) THEN
    ALTER TABLE contacts
      ADD CONSTRAINT contacts_agency_fk
      FOREIGN KEY (agency_id) REFERENCES agencies(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

ALTER TABLE contacts
  VALIDATE CONSTRAINT contacts_agency_fk;

CREATE INDEX IF NOT EXISTS contacts_agency_coverage_active_idx
  ON contacts (agency_id, coverage_type, active);

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS dialed_phone TEXT;

CREATE INDEX IF NOT EXISTS incidents_category_location_created_at_idx
  ON incidents (category, province_code, district_code, created_at DESC);

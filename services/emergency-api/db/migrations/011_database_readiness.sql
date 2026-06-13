DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'contacts_category_fk'
  ) THEN
    ALTER TABLE contacts
      ADD CONSTRAINT contacts_category_fk
      FOREIGN KEY (category) REFERENCES emergency_categories(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

ALTER TABLE contacts
  VALIDATE CONSTRAINT contacts_category_fk;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'incidents_category_fk'
  ) THEN
    ALTER TABLE incidents
      ADD CONSTRAINT incidents_category_fk
      FOREIGN KEY (category) REFERENCES emergency_categories(id)
      ON DELETE RESTRICT
      NOT VALID;
  END IF;
END $$;

ALTER TABLE incidents
  VALIDATE CONSTRAINT incidents_category_fk;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'incidents_severity_check'
  ) THEN
    ALTER TABLE incidents
      ADD CONSTRAINT incidents_severity_check
      CHECK (severity IN ('low', 'medium', 'high', 'critical'))
      NOT VALID;
  END IF;
END $$;

ALTER TABLE incidents
  VALIDATE CONSTRAINT incidents_severity_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'incidents_status_check'
  ) THEN
    ALTER TABLE incidents
      ADD CONSTRAINT incidents_status_check
      CHECK (status IN ('open', 'acknowledged', 'closed'))
      NOT VALID;
  END IF;
END $$;

ALTER TABLE incidents
  VALIDATE CONSTRAINT incidents_status_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'incidents_call_status_check'
  ) THEN
    ALTER TABLE incidents
      ADD CONSTRAINT incidents_call_status_check
      CHECK (
        call_status IS NULL OR
        call_status IN ('connected', 'busy', 'no-answer', 'wrong-number', 'cancelled')
      )
      NOT VALID;
  END IF;
END $$;

ALTER TABLE incidents
  VALIDATE CONSTRAINT incidents_call_status_check;

CREATE INDEX IF NOT EXISTS contacts_created_at_idx
  ON contacts (created_at DESC);

CREATE INDEX IF NOT EXISTS contacts_coverage_type_created_at_idx
  ON contacts (coverage_type, created_at DESC);

CREATE INDEX IF NOT EXISTS incidents_created_at_idx
  ON incidents (created_at DESC);

BEGIN;

-- เพิ่ม field ที่ทำให้ mobile/admin ติดตาม workflow เดียวกันได้
-- client_request_id กัน mobile สร้าง incident ซ้ำจาก retry
-- status_version ใช้กับ PATCH /api/incidents/:id/status เพื่อทำ optimistic concurrency
ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS client_request_id TEXT,
  ADD COLUMN IF NOT EXISTS dialed_phone TEXT,
  ADD COLUMN IF NOT EXISTS status_version INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'incidents_client_request_id_not_blank_check'
  ) THEN
    ALTER TABLE incidents
      ADD CONSTRAINT incidents_client_request_id_not_blank_check
      CHECK (client_request_id IS NULL OR btrim(client_request_id) <> '')
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'incidents_status_version_check'
  ) THEN
    ALTER TABLE incidents
      ADD CONSTRAINT incidents_status_version_check
      CHECK (status_version >= 0)
      NOT VALID;
  END IF;
END $$;

ALTER TABLE incidents
  VALIDATE CONSTRAINT incidents_client_request_id_not_blank_check;

ALTER TABLE incidents
  VALIDATE CONSTRAINT incidents_status_version_check;

ALTER TABLE incidents
  DROP CONSTRAINT IF EXISTS incidents_status_check;

ALTER TABLE incidents
  ADD CONSTRAINT incidents_status_check
  CHECK (
    status IN (
      'open', 'reported', 'acknowledged', 'coordinating',
      'dispatched', 'on_scene', 'closed'
    )
  )
  NOT VALID;

ALTER TABLE incidents
  VALIDATE CONSTRAINT incidents_status_check;

CREATE UNIQUE INDEX IF NOT EXISTS incidents_client_request_id_uidx
  ON incidents (client_request_id)
  WHERE client_request_id IS NOT NULL;

-- ประวัติทุกครั้งที่ workflow เปลี่ยน ใช้ทั้ง mobile tracking timeline และ admin audit/debug
CREATE TABLE IF NOT EXISTS incident_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  note TEXT,
  changed_by_admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  changed_by_role TEXT NOT NULL,
  status_version INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT incident_status_history_from_status_check CHECK (
    from_status IS NULL OR from_status IN (
      'open', 'reported', 'acknowledged', 'coordinating',
      'dispatched', 'on_scene', 'closed'
    )
  ),
  CONSTRAINT incident_status_history_to_status_check CHECK (
    to_status IN (
      'open', 'reported', 'acknowledged', 'coordinating',
      'dispatched', 'on_scene', 'closed'
    )
  ),
  CONSTRAINT incident_status_history_role_check CHECK (
    changed_by_role IN ('mobile', 'agency_admin', 'super_admin', 'system')
  ),
  CONSTRAINT incident_status_history_version_check CHECK (status_version >= 0)
);

CREATE INDEX IF NOT EXISTS incident_status_history_incident_created_idx
  ON incident_status_history (incident_id, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS incident_location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location GEOMETRY(POINT, 4326) NOT NULL,
  accuracy DOUBLE PRECISION,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT incident_location_history_latitude_check
    CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT incident_location_history_longitude_check
    CHECK (longitude BETWEEN -180 AND 180),
  CONSTRAINT incident_location_history_accuracy_check
    CHECK (accuracy IS NULL OR accuracy >= 0),
  CONSTRAINT incident_location_history_source_check
    CHECK (source IN ('initial', 'user_update'))
);

CREATE INDEX IF NOT EXISTS incident_location_history_incident_created_idx
  ON incident_location_history (incident_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS incident_location_history_location_gix
  ON incident_location_history USING GIST (location);

COMMIT;

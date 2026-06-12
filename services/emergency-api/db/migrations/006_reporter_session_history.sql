ALTER TABLE incidents ADD COLUMN IF NOT EXISTS reporter_phone TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS session_id TEXT;

CREATE INDEX IF NOT EXISTS incidents_session_id_idx ON incidents(session_id);
CREATE INDEX IF NOT EXISTS incidents_reporter_phone_idx ON incidents(reporter_phone);

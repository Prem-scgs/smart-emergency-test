-- Migration 006: เพิ่ม reporter session/history สำหรับ mobile tracking
-- Endpoint history/tracking ใช้ session_id เพื่อยืนยันว่า reporter เป็นเจ้าของ incident

ALTER TABLE incidents ADD COLUMN IF NOT EXISTS reporter_phone TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS session_id TEXT;

CREATE INDEX IF NOT EXISTS incidents_session_id_idx ON incidents(session_id);
CREATE INDEX IF NOT EXISTS incidents_reporter_phone_idx ON incidents(reporter_phone);

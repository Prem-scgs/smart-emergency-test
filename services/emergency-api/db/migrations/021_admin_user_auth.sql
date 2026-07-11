-- Migration 021: real admin credentials and viewer role support.
BEGIN;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- บัญชีจาก mock auth เดิมไม่มี credential จริง จึงเก็บ row ไว้เพื่อรักษา audit/history reference
-- แต่ปิดการใช้งานและเติมค่า placeholder ที่ login ไม่ได้ ก่อนบังคับ NOT NULL contract ใหม่
UPDATE admin_users
SET
  email = COALESCE(email, 'legacy-' || id::text || '@invalid.local'),
  display_name = COALESCE(display_name, 'Legacy admin'),
  password_hash = COALESCE(password_hash, 'disabled$legacy$account'),
  active = false,
  updated_at = now()
WHERE email IS NULL OR display_name IS NULL OR password_hash IS NULL;

ALTER TABLE admin_users ALTER COLUMN email SET NOT NULL;
ALTER TABLE admin_users ALTER COLUMN display_name SET NOT NULL;
ALTER TABLE admin_users ALTER COLUMN password_hash SET NOT NULL;

DROP INDEX IF EXISTS admin_users_email_normalized_uidx;
CREATE UNIQUE INDEX admin_users_email_normalized_uidx ON admin_users (lower(email));

ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check CHECK (role IN ('super_admin', 'agency_admin', 'viewer')) NOT VALID;
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_agency_check;
ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_agency_check CHECK (
  (role = 'super_admin' AND agency_id IS NULL) OR
  (role IN ('agency_admin', 'viewer') AND agency_id IS NOT NULL)
) NOT VALID;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM admin_users WHERE role NOT IN ('super_admin', 'agency_admin', 'viewer')) THEN
    RAISE EXCEPTION 'Migration 021 cannot continue: admin_users contains unsupported roles';
  END IF;
  IF EXISTS (SELECT 1 FROM admin_users WHERE (role='super_admin' AND agency_id IS NOT NULL) OR (role IN ('agency_admin','viewer') AND agency_id IS NULL)) THEN
    RAISE EXCEPTION 'Migration 021 cannot continue: admin_users role/agency assignments are invalid';
  END IF;
END $$;

ALTER TABLE admin_users VALIDATE CONSTRAINT admin_users_role_agency_check;
ALTER TABLE admin_users VALIDATE CONSTRAINT admin_users_role_check;
COMMIT;

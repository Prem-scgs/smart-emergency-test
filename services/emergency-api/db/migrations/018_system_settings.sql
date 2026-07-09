BEGIN;

-- ค่าองค์กรที่ admin shell/settings ใช้แสดงชื่อระบบและ timezone กลาง
-- เก็บเป็น key-value เพื่อเพิ่ม setting ใหม่ได้ง่ายโดยไม่ต้องแก้ schema ทุกครั้ง
CREATE TABLE IF NOT EXISTS system_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT system_settings_key_check
    CHECK (setting_key IN ('system_name', 'organization_name', 'timezone')),
  CONSTRAINT system_settings_value_not_blank_check
    CHECK (btrim(setting_value) <> '')
);

INSERT INTO system_settings (setting_key, setting_value, updated_by)
VALUES
  ('system_name', 'Smart Emergency Platform', 'migration'),
  ('organization_name', 'ศูนย์บัญชาการเหตุฉุกเฉิน', 'migration'),
  ('timezone', 'Asia/Bangkok', 'migration')
ON CONFLICT (setting_key) DO NOTHING;

COMMIT;

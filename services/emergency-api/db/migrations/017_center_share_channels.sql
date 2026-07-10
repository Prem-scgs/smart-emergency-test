-- Migration 017: เพิ่ม settings สำหรับช่องทางแชร์ตำแหน่งส่วนกลาง
-- Settings page และ mobile location sharing ใช้ค่า DB เหล่านี้ก่อน fallback ไป env

BEGIN;

-- ช่องทางแชร์ตำแหน่งส่วนกลางที่หน้า Settings ของ super_admin จัดการได้
-- backend จะ mask recipient ตอนส่งออก public/admin read เพื่อลดโอกาสหลุดข้อมูลปลายทาง
CREATE TABLE IF NOT EXISTS center_share_channels (
  channel TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  recipient_value TEXT,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT center_share_channels_channel_check
    CHECK (channel IN ('line', 'sms', 'whatsapp')),
  CONSTRAINT center_share_channels_recipient_not_blank_check
    CHECK (recipient_value IS NULL OR btrim(recipient_value) <> '')
);

CREATE INDEX IF NOT EXISTS center_share_channels_enabled_idx
  ON center_share_channels (enabled);

COMMIT;

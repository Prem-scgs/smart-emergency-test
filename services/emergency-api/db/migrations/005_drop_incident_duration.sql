-- Migration 005: ลบ field duration ที่ไม่ใช้ใน incident workflow แล้ว
-- ถ้าต้องใช้ duration ใน report/UI อีกครั้ง ให้เพิ่ม migration ใหม่แทนการแก้ไฟล์นี้ย้อนหลัง

ALTER TABLE incidents DROP COLUMN IF EXISTS duration_seconds;

-- Migration 015: ลบ mock tables ที่ไม่อยู่ใน production flow แล้ว
-- ห้ามลบ migration นี้ แม้ตาราง mock ไม่เหลือ เพราะ DB ใหม่ต้อง replay ลำดับเดิมได้

DROP TABLE IF EXISTS user_emergency_contacts;
DROP TABLE IF EXISTS app_users;
DROP TABLE IF EXISTS dashboard_snapshots;

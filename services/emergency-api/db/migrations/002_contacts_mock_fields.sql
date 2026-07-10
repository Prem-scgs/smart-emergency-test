-- Migration 002: เพิ่ม field ที่ contacts mock/early UI เคยใช้
-- คงไว้เพื่อให้ DB ใหม่ replay migration ได้ครบ แม้ production UI ถูก refactor แล้ว

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS province TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS is_24_hours BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS contacts_category_idx ON contacts(category);
CREATE INDEX IF NOT EXISTS contacts_province_district_idx ON contacts(province, district);

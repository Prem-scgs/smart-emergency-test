-- Migration 014: Backfill ข้อมูลให้เข้ากับ target schema หลัง Phase 1
-- เป็น data migration ที่ช่วยให้ข้อมูลเก่าไม่หลุด constraint ใหม่

INSERT INTO agencies (name, category_id, active)
SELECT
  COALESCE(NULLIF(recommended_agency, ''), NULLIF(label_th, ''), NULLIF(name, ''), id) AS name,
  id AS category_id,
  active
FROM emergency_categories
ON CONFLICT DO NOTHING;

UPDATE contacts c
SET
  agency_id = a.id,
  updated_at = now()
FROM agencies a
WHERE c.category = a.category_id
  AND c.category IS NOT NULL
  AND c.agency_id IS NULL;

UPDATE incidents i
SET
  dialed_phone = c.phone,
  updated_at = now()
FROM contacts c
WHERE i.agency_contact_id = c.id
  AND i.agency_contact_id IS NOT NULL
  AND i.dialed_phone IS NULL;

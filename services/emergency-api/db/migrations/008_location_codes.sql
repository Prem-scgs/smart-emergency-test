-- Migration 008: เพิ่ม province/district code เพื่อผูก location กับ master data
-- กระทบ contacts selector, GIS labels, dashboard filters และ mobile location display

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS province_code TEXT,
  ADD COLUMN IF NOT EXISTS district_code TEXT;

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS province_code TEXT,
  ADD COLUMN IF NOT EXISTS district_code TEXT;

CREATE INDEX IF NOT EXISTS contacts_province_code_district_code_idx
  ON contacts (province_code, district_code);

CREATE INDEX IF NOT EXISTS incidents_province_code_district_code_idx
  ON incidents (province_code, district_code);

WITH matched_contact_areas AS (
  SELECT
    c.id,
    a.province_code,
    a.district_code,
    a.province_name_en,
    a.province_name_th,
    a.district_name_en,
    a.district_name_th
  FROM contacts c
  JOIN LATERAL (
    SELECT
      province_code,
      district_code,
      province_name_en,
      province_name_th,
      district_name_en,
      district_name_th
    FROM areas
    WHERE c.location IS NOT NULL
      AND area_type IN ('district', 'province')
      AND ST_Contains(polygon, c.location)
    ORDER BY CASE WHEN area_type = 'district' THEN 0 ELSE 1 END, created_at DESC
    LIMIT 1
  ) a ON true
)
UPDATE contacts c
SET
  province_code = COALESCE(c.province_code, m.province_code),
  district_code = COALESCE(c.district_code, m.district_code),
  province = COALESCE(c.province, m.province_name_en, m.province_name_th),
  district = COALESCE(c.district, m.district_name_en, m.district_name_th),
  updated_at = now()
FROM matched_contact_areas m
WHERE c.id = m.id;

WITH matched_incident_areas AS (
  SELECT
    i.id,
    a.province_code,
    a.district_code,
    a.province_name_en,
    a.province_name_th,
    a.district_name_en,
    a.district_name_th
  FROM incidents i
  JOIN LATERAL (
    SELECT
      province_code,
      district_code,
      province_name_en,
      province_name_th,
      district_name_en,
      district_name_th
    FROM areas
    WHERE i.location IS NOT NULL
      AND area_type IN ('district', 'province')
      AND ST_Contains(polygon, i.location)
    ORDER BY CASE WHEN area_type = 'district' THEN 0 ELSE 1 END, created_at DESC
    LIMIT 1
  ) a ON true
)
UPDATE incidents i
SET
  province_code = COALESCE(i.province_code, m.province_code),
  district_code = COALESCE(i.district_code, m.district_code),
  province = COALESCE(i.province, m.province_name_en, m.province_name_th),
  district = COALESCE(i.district, m.district_name_en, m.district_name_th)
FROM matched_incident_areas m
WHERE i.id = m.id;

-- Migration 010: เพิ่ม generated column coverage_type ให้ contacts
-- ต้องมาก่อน readiness/target schema ที่อ้าง column นี้ใน migration ถัดไป

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS coverage_type TEXT GENERATED ALWAYS AS (
    CASE
      WHEN district_code IS NOT NULL OR district IS NOT NULL THEN 'district'
      WHEN province_code IS NOT NULL OR province IS NOT NULL THEN 'province'
      ELSE 'central'
    END
  ) STORED;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'contacts_coverage_type_check'
  ) THEN
    ALTER TABLE contacts
      ADD CONSTRAINT contacts_coverage_type_check
      CHECK (coverage_type IN ('central', 'province', 'district'))
      NOT VALID;
  END IF;
END $$;

ALTER TABLE contacts
  VALIDATE CONSTRAINT contacts_coverage_type_check;

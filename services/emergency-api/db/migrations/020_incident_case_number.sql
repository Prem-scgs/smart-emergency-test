-- เพิ่มเลขเคสที่มนุษย์อ่านง่าย เช่น EMS-20260704-0001
-- UUID ยังเป็น id ภายในระบบ ส่วน case_number ใช้แสดงในหน้า user/admin
-- counter แยกตาม category + วันที่ไทย เพื่อให้แต่ละหน่วยงานรันเลขของตัวเองและ reset ทุกวัน
CREATE TABLE IF NOT EXISTS incident_case_counters (
  category TEXT NOT NULL,
  case_date DATE NOT NULL,
  last_sequence INTEGER NOT NULL DEFAULT 0 CHECK (last_sequence >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (category, case_date)
);

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS case_number TEXT,
  ADD COLUMN IF NOT EXISTS case_date DATE,
  ADD COLUMN IF NOT EXISTS case_sequence INTEGER;

-- Backfill incident เก่าให้มีเลขเคสตามลำดับ created_at เดิม
WITH ordered_incidents AS (
  SELECT
    id,
    category,
    (created_at AT TIME ZONE 'Asia/Bangkok')::date AS next_case_date,
    row_number() OVER (
      PARTITION BY category, (created_at AT TIME ZONE 'Asia/Bangkok')::date
      ORDER BY created_at ASC, id ASC
    )::int AS next_case_sequence
  FROM incidents
  WHERE case_number IS NULL
     OR case_date IS NULL
     OR case_sequence IS NULL
),
numbered_incidents AS (
  SELECT
    id,
    next_case_date,
    next_case_sequence,
    (
      CASE category
        WHEN 'police' THEN 'POL'
        WHEN 'medical' THEN 'EMS'
        WHEN 'fire' THEN 'FIR'
        WHEN 'rescue' THEN 'RES'
        WHEN 'flood' THEN 'FLD'
        WHEN 'road-accident' THEN 'RTA'
        ELSE left(regexp_replace(upper(category), '[^A-Z0-9]', '', 'g') || 'XXX', 3)
      END
      || '-' || to_char(next_case_date, 'YYYYMMDD')
      || '-' || lpad(next_case_sequence::text, 4, '0')
    ) AS next_case_number
  FROM ordered_incidents
)
UPDATE incidents i
SET
  case_number = n.next_case_number,
  case_date = n.next_case_date,
  case_sequence = n.next_case_sequence
FROM numbered_incidents n
WHERE i.id = n.id;

-- ตั้ง counter ให้ต่อจากเลข backfill ล่าสุด ไม่เริ่มทับข้อมูลเก่า
INSERT INTO incident_case_counters (category, case_date, last_sequence)
SELECT category, case_date, max(case_sequence)::int
FROM incidents
WHERE case_date IS NOT NULL
  AND case_sequence IS NOT NULL
GROUP BY category, case_date
ON CONFLICT (category, case_date)
DO UPDATE SET
  last_sequence = GREATEST(
    incident_case_counters.last_sequence,
    EXCLUDED.last_sequence
  ),
  updated_at = now();

CREATE UNIQUE INDEX IF NOT EXISTS incidents_case_number_uidx
  ON incidents (case_number)
  WHERE case_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS incidents_category_case_date_sequence_uidx
  ON incidents (category, case_date, case_sequence)
  WHERE case_date IS NOT NULL
    AND case_sequence IS NOT NULL;

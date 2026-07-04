BEGIN;

CREATE TABLE IF NOT EXISTS incident_case_counters (
  case_date DATE PRIMARY KEY,
  next_sequence INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT incident_case_counters_next_sequence_check CHECK (next_sequence >= 1)
);

DROP FUNCTION IF EXISTS next_incident_case_identity();

CREATE FUNCTION next_incident_case_identity()
RETURNS TABLE(out_case_number TEXT, out_case_date DATE, out_case_sequence INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
  today DATE := (now() AT TIME ZONE 'Asia/Bangkok')::date;
  next_value INTEGER;
BEGIN
  INSERT INTO incident_case_counters (case_date, next_sequence)
  VALUES (today, 2)
  ON CONFLICT ON CONSTRAINT incident_case_counters_pkey
  DO UPDATE SET next_sequence = incident_case_counters.next_sequence + 1
  RETURNING incident_case_counters.next_sequence - 1 INTO next_value;

  out_case_date := today;
  out_case_sequence := next_value;
  out_case_number := 'SE-' || to_char(today, 'YYMMDD') || '-' || lpad(next_value::text, 4, '0');
  RETURN NEXT;
END;
$$;

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS case_number TEXT,
  ADD COLUMN IF NOT EXISTS case_date DATE,
  ADD COLUMN IF NOT EXISTS case_sequence INTEGER,
  ADD COLUMN IF NOT EXISTS tracking_token_hash TEXT;

WITH ranked AS (
  SELECT
    id,
    (created_at AT TIME ZONE 'Asia/Bangkok')::date AS generated_case_date,
    row_number() OVER (
      PARTITION BY (created_at AT TIME ZONE 'Asia/Bangkok')::date
      ORDER BY created_at, id
    ) AS generated_case_sequence
  FROM incidents
  WHERE case_number IS NULL
)
UPDATE incidents i
SET
  case_date = ranked.generated_case_date,
  case_sequence = ranked.generated_case_sequence,
  case_number = 'SE-' || to_char(ranked.generated_case_date, 'YYMMDD') || '-' || lpad(ranked.generated_case_sequence::text, 4, '0')
FROM ranked
WHERE i.id = ranked.id;

INSERT INTO incident_case_counters (case_date, next_sequence)
SELECT case_date, max(case_sequence) + 1
FROM incidents
WHERE case_date IS NOT NULL AND case_sequence IS NOT NULL
GROUP BY case_date
ON CONFLICT (case_date)
DO UPDATE SET next_sequence = GREATEST(incident_case_counters.next_sequence, EXCLUDED.next_sequence);

ALTER TABLE incidents
  ALTER COLUMN case_number SET NOT NULL,
  ALTER COLUMN case_date SET NOT NULL,
  ALTER COLUMN case_sequence SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'incidents_case_number_key'
  ) THEN
    ALTER TABLE incidents
      ADD CONSTRAINT incidents_case_number_key UNIQUE (case_number);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'incidents_case_date_sequence_key'
  ) THEN
    ALTER TABLE incidents
      ADD CONSTRAINT incidents_case_date_sequence_key UNIQUE (case_date, case_sequence);
  END IF;
END $$;

COMMIT;

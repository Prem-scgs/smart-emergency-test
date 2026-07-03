BEGIN;

-- iPhone/Android GPS accuracy can be fractional meters, so incidents must match
-- incident_location_history and accept decimal values without failing create.
ALTER TABLE incidents
  ALTER COLUMN accuracy TYPE DOUBLE PRECISION
  USING accuracy::DOUBLE PRECISION;

COMMIT;

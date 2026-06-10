ALTER TABLE areas
  ALTER COLUMN polygon TYPE GEOMETRY(MULTIPOLYGON, 4326)
  USING ST_Multi(polygon);

ALTER TABLE areas ADD COLUMN IF NOT EXISTS area_type TEXT NOT NULL DEFAULT 'response-zone';
ALTER TABLE areas ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE areas ADD COLUMN IF NOT EXISTS source_code TEXT;
ALTER TABLE areas ADD COLUMN IF NOT EXISTS province_code TEXT;
ALTER TABLE areas ADD COLUMN IF NOT EXISTS province_name_th TEXT;
ALTER TABLE areas ADD COLUMN IF NOT EXISTS province_name_en TEXT;
ALTER TABLE areas ADD COLUMN IF NOT EXISTS district_code TEXT;
ALTER TABLE areas ADD COLUMN IF NOT EXISTS district_name_th TEXT;
ALTER TABLE areas ADD COLUMN IF NOT EXISTS district_name_en TEXT;
ALTER TABLE areas ADD COLUMN IF NOT EXISTS parent_area_id UUID REFERENCES areas(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'areas_area_type_check'
  ) THEN
    ALTER TABLE areas
      ADD CONSTRAINT areas_area_type_check
      CHECK (area_type IN ('province', 'district', 'subdistrict', 'response-zone'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS areas_source_type_code_uidx
  ON areas (source, area_type, source_code)
  WHERE source IS NOT NULL AND source_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS areas_area_type_idx ON areas (area_type);
CREATE INDEX IF NOT EXISTS areas_province_code_idx ON areas (province_code);
CREATE INDEX IF NOT EXISTS areas_district_code_idx ON areas (district_code);
CREATE INDEX IF NOT EXISTS areas_parent_area_id_idx ON areas (parent_area_id);

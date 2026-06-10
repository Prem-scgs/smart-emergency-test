ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS province TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS is_24_hours BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS contacts_category_idx ON contacts(category);
CREATE INDEX IF NOT EXISTS contacts_province_district_idx ON contacts(province, district);

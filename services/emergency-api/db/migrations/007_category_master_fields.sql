-- Migration 007: ขยาย emergency category master data
-- Frontend reference loaders ใช้ label/icon/color/sort_order/active จาก columns ชุดนี้

ALTER TABLE emergency_categories ADD COLUMN IF NOT EXISTS label_th TEXT;
ALTER TABLE emergency_categories ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE emergency_categories ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

UPDATE emergency_categories
SET
  label_th = CASE id
    WHEN 'police' THEN 'ตำรวจ'
    WHEN 'medical' THEN 'แพทย์'
    WHEN 'fire' THEN 'ดับเพลิง'
    WHEN 'rescue' THEN 'กู้ภัย'
    WHEN 'flood' THEN 'น้ำท่วม'
    WHEN 'road-accident' THEN 'อุบัติเหตุทางถนน'
    ELSE COALESCE(label_th, name)
  END,
  sort_order = CASE id
    WHEN 'police' THEN 1
    WHEN 'medical' THEN 2
    WHEN 'fire' THEN 3
    WHEN 'rescue' THEN 4
    WHEN 'flood' THEN 5
    WHEN 'road-accident' THEN 6
    ELSE sort_order
  END,
  active = true
WHERE id IN ('police', 'medical', 'fire', 'rescue', 'flood', 'road-accident');

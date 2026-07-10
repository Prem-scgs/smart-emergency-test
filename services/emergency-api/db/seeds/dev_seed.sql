-- Development seed สำหรับ local demo/test
-- ใช้เติมข้อมูลตัวอย่างหลัง db-reset เท่านั้น ไม่ควรใช้แทน migration หรือ production seed จริง

INSERT INTO areas
  (id, name, color, polygon)
VALUES
  (
    '99999999-9999-4999-8999-999999999999',
    'Bangkok Pathum Wan Response Zone',
    '#ef4444',
    ST_Multi(ST_SetSRID(
      ST_GeomFromGeoJSON(
        '{"type":"Polygon","coordinates":[[[100.49,13.73],[100.55,13.73],[100.55,13.78],[100.49,13.78],[100.49,13.73]]]}'
      ),
      4326
    ))
  )
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  color = EXCLUDED.color,
  polygon = EXCLUDED.polygon,
  updated_at = now();

INSERT INTO emergency_categories
  (id, name, description, icon, color, bg_color, recommended_agency)
VALUES
  (
    'police',
    'Police Emergency',
    'Report crimes, theft, assault, or suspicious activities',
    'ShieldAlert',
    'text-blue-600 dark:text-blue-400',
    'bg-blue-100 dark:bg-blue-900/30',
    'Royal Thai Police'
  ),
  (
    'medical',
    'Medical Emergency',
    'Request ambulance or medical assistance',
    'Ambulance',
    'text-red-600 dark:text-red-400',
    'bg-red-100 dark:bg-red-900/30',
    'Emergency Medical Services'
  ),
  (
    'fire',
    'Fire Emergency',
    'Report fire incidents or request fire rescue',
    'Flame',
    'text-orange-600 dark:text-orange-400',
    'bg-orange-100 dark:bg-orange-900/30',
    'Fire Department'
  ),
  (
    'rescue',
    'Rescue Team',
    'Request rescue operations for emergencies',
    'LifeBuoy',
    'text-emerald-600 dark:text-emerald-400',
    'bg-emerald-100 dark:bg-emerald-900/30',
    'National Rescue Team'
  ),
  (
    'flood',
    'Flood Disaster',
    'Report flooding or request evacuation assistance',
    'Waves',
    'text-cyan-600 dark:text-cyan-400',
    'bg-cyan-100 dark:bg-cyan-900/30',
    'Disaster Prevention Center'
  ),
  (
    'road-accident',
    'Road Accident',
    'Report traffic accidents or road emergencies',
    'Car',
    'text-amber-600 dark:text-amber-400',
    'bg-amber-100 dark:bg-amber-900/30',
    'Highway Police'
  )
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  bg_color = EXCLUDED.bg_color,
  recommended_agency = EXCLUDED.recommended_agency,
  updated_at = now();

INSERT INTO provinces (id, name)
VALUES
  ('bangkok', 'Bangkok'),
  ('chiang-mai', 'Chiang Mai'),
  ('chiang-rai', 'Chiang Rai'),
  ('chonburi', 'Chonburi'),
  ('khon-kaen', 'Khon Kaen'),
  ('krabi', 'Krabi'),
  ('nakhon-ratchasima', 'Nakhon Ratchasima'),
  ('nonthaburi', 'Nonthaburi'),
  ('pathum-thani', 'Pathum Thani'),
  ('phuket', 'Phuket'),
  ('samut-prakan', 'Samut Prakan'),
  ('songkhla', 'Songkhla'),
  ('surat-thani', 'Surat Thani'),
  ('udon-thani', 'Udon Thani')
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  updated_at = now();

INSERT INTO districts (id, province_id, name)
VALUES
  ('bangkok-pathum-wan', 'bangkok', 'Pathum Wan'),
  ('bangkok-chatuchak', 'bangkok', 'Chatuchak'),
  ('bangkok-ratchathewi', 'bangkok', 'Ratchathewi'),
  ('chiang-mai-san-sai', 'chiang-mai', 'San Sai'),
  ('chiang-mai-hang-dong', 'chiang-mai', 'Hang Dong'),
  ('chiang-mai-mae-rim', 'chiang-mai', 'Mae Rim'),
  ('chiang-mai-san-kamphaeng', 'chiang-mai', 'San Kamphaeng'),
  ('phuket-mueang-phuket', 'phuket', 'Mueang Phuket'),
  ('phuket-kathu', 'phuket', 'Kathu'),
  ('phuket-thalang', 'phuket', 'Thalang'),
  ('chonburi-mueang-chonburi', 'chonburi', 'Mueang Chonburi'),
  ('chonburi-bang-lamung', 'chonburi', 'Bang Lamung'),
  ('chonburi-si-racha', 'chonburi', 'Si Racha')
ON CONFLICT (id) DO UPDATE
SET
  province_id = EXCLUDED.province_id,
  name = EXCLUDED.name,
  updated_at = now();

INSERT INTO contacts
  (id, name, phone, role, category, province_code, province, district_code, district, latitude, longitude, location, active, is_24_hours)
VALUES
  (
    '11111111-1111-4111-8111-111111111111',
    'Central Police Station',
    '191',
    'responder',
    'police',
    '10',
    'Bangkok',
    '1007',
    'Pathum Wan',
    13.7465,
    100.5331,
    ST_SetSRID(ST_MakePoint(100.5331, 13.7465), 4326),
    true,
    true
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'Emergency Medical Services',
    '1669',
    'responder',
    'medical',
    '10',
    'Bangkok',
    '1007',
    'Pathum Wan',
    13.7478,
    100.5351,
    ST_SetSRID(ST_MakePoint(100.5351, 13.7478), 4326),
    true,
    true
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'Fire Station District 1',
    '199',
    'responder',
    'fire',
    '10',
    'Bangkok',
    '1007',
    'Pathum Wan',
    13.7442,
    100.5298,
    ST_SetSRID(ST_MakePoint(100.5298, 13.7442), 4326),
    true,
    true
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'National Rescue Foundation',
    '1554',
    'responder',
    'rescue',
    '10',
    'Bangkok',
    '1007',
    'Pathum Wan',
    13.7486,
    100.5344,
    ST_SetSRID(ST_MakePoint(100.5344, 13.7486), 4326),
    true,
    true
  ),
  (
    '55555555-5555-4555-8555-555555555555',
    'Disaster Prevention Center',
    '1784',
    'responder',
    'flood',
    '10',
    'Bangkok',
    '1007',
    'Pathum Wan',
    13.7489,
    100.5367,
    ST_SetSRID(ST_MakePoint(100.5367, 13.7489), 4326),
    true,
    true
  ),
  (
    '66666666-6666-4666-8666-666666666661',
    'Highway Police Support Center',
    '1193',
    'responder',
    'road-accident',
    '10',
    'Bangkok',
    '1007',
    'Pathum Wan',
    13.7426,
    100.5314,
    ST_SetSRID(ST_MakePoint(100.5314, 13.7426), 4326),
    true,
    true
  )
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  category = EXCLUDED.category,
  province_code = EXCLUDED.province_code,
  province = EXCLUDED.province,
  district_code = EXCLUDED.district_code,
  district = EXCLUDED.district,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  location = EXCLUDED.location,
  active = EXCLUDED.active,
  is_24_hours = EXCLUDED.is_24_hours,
  updated_at = now();

INSERT INTO incidents
  (
    id,
    category,
    severity,
    status,
    description,
    agency_contact_id,
    province_code,
    province,
    district_code,
    district,
    accuracy,
    call_status,
    latitude,
    longitude,
    location,
    created_at,
    updated_at
  )
VALUES
  (
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
    'medical',
    'high',
    'closed',
    'Ambulance dispatched successfully',
    '22222222-2222-4222-8222-222222222222',
    '10',
    'Bangkok',
    '1007',
    'Pathum Wan',
    15,
    'connected',
    13.7563,
    100.5018,
    ST_SetSRID(ST_MakePoint(100.5018, 13.7563), 4326),
    '2024-01-15T10:30:00+07:00',
    '2024-01-15T10:30:00+07:00'
  ),
  (
    'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb',
    'police',
    'medium',
    'closed',
    'Patrol unit responded',
    '11111111-1111-4111-8111-111111111111',
    '10',
    'Bangkok',
    '1007',
    'Pathum Wan',
    10,
    'connected',
    13.7563,
    100.5018,
    ST_SetSRID(ST_MakePoint(100.5018, 13.7563), 4326),
    '2024-01-14T15:45:00+07:00',
    '2024-01-14T15:45:00+07:00'
  ),
  (
    'cccccccc-3333-4333-8333-cccccccccccc',
    'fire',
    'critical',
    'open',
    'Called back after 5 minutes',
    '33333333-3333-4333-8333-333333333333',
    '10',
    'Bangkok',
    '1007',
    'Pathum Wan',
    20,
    'no-answer',
    13.7563,
    100.5018,
    ST_SetSRID(ST_MakePoint(100.5018, 13.7563), 4326),
    '2024-01-13T08:20:00+07:00',
    '2024-01-13T08:20:00+07:00'
  )
ON CONFLICT (id) DO UPDATE
SET
  category = EXCLUDED.category,
  severity = EXCLUDED.severity,
  status = EXCLUDED.status,
  description = EXCLUDED.description,
  agency_contact_id = EXCLUDED.agency_contact_id,
  province_code = EXCLUDED.province_code,
  province = EXCLUDED.province,
  district_code = EXCLUDED.district_code,
  district = EXCLUDED.district,
  accuracy = EXCLUDED.accuracy,
  call_status = EXCLUDED.call_status,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  location = EXCLUDED.location,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at;


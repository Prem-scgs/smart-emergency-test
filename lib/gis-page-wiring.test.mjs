import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const page = readFileSync('app/admin/(dashboard)/gis/page.tsx', 'utf8')

test('gis page is a read-only boundary viewer backed by real area APIs', () => {
  assert.match(page, /\/api\/areas\?areaType=province/)
  assert.match(page, /\/api\/areas\?areaType=district/)
  assert.match(page, /\/api\/areas\/\$\{area\.id\}\/contacts/)
  assert.match(page, /\/api\/areas\/\$\{area\.id\}\/incidents/)
  assert.match(page, /GisBoundaryMap/)

  assert.doesNotMatch(page, /app\.post\("\/api\/areas"/)
  assert.doesNotMatch(page, /app\.put\("\/api\/areas\/:id"/)
  assert.doesNotMatch(page, /app\.delete\("\/api\/areas\/:id"/)
  assert.doesNotMatch(page, /วาดพื้นที่|แก้ไขขอบเขต|ลบขอบเขต|เพิ่มขอบเขต/)
})

test('gis page copy explains readonly GIS scope in Thai', () => {
  assert.match(page, /พื้นที่ GIS/)
  assert.match(page, /ดูขอบเขตจังหวัดและอำเภอ/)
  assert.match(page, /ไม่พบเบอร์ในพื้นที่นี้/)
  assert.match(page, /ไม่พบเหตุการณ์ในพื้นที่นี้/)

  assert.doesNotMatch(page, /จัดการพื้นที่ GIS/)
  assert.doesNotMatch(page, /Selected Area/)
  assert.doesNotMatch(page, /geometry points/)
  assert.doesNotMatch(page, /Failed to load/)
  assert.doesNotMatch(page, /Loading map/)
  assert.doesNotMatch(page, /No description/)
})

test('gis province select renders Thai province label instead of raw province code', () => {
  assert.match(page, /selectedProvinceLabel/)
  assert.match(page, /<span className="truncate">\{selectedProvinceLabel\}<\/span>/)
  assert.match(page, /provinceDisplay\(province\)/)

  assert.doesNotMatch(page, /<SelectValue placeholder="เลือกจังหวัด" \/>/)
})

test('gis district list card does not stretch taller than its scroll list', () => {
  assert.match(page, /<Card className="self-start">/)
  assert.match(page, /max-h-\[520px\]/)

  assert.doesNotMatch(page, /<Card>\s*<CardHeader>\s*<CardTitle className="text-base">พื้นที่บริการ/)
  assert.doesNotMatch(page, /max-h-\[420px\]/)
})

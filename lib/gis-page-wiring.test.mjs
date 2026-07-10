/**
 * ???? GIS page/widget boundary ??? localized boundary/marker labels.
 */
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const route = readFileSync('app/admin/(dashboard)/gis/page.tsx', 'utf8')
const page = readFileSync('widgets/admin-gis/ui/gis-page.tsx', 'utf8')
const map = readFileSync('widgets/admin-gis/ui/gis-boundary-map.tsx', 'utf8')
const widget = readFileSync('widgets/admin-gis/index.ts', 'utf8')
const areaEntity = readFileSync('entities/area/index.ts', 'utf8')
const i18n = [
  readFileSync('shared/i18n/admin/admin-i18n-context.tsx', 'utf8'),
  readFileSync('shared/i18n/admin/dictionaries/th.ts', 'utf8'),
  readFileSync('shared/i18n/admin/dictionaries/en.ts', 'utf8'),
].join('\n')

test('gis page is a read-only boundary viewer backed by real area APIs', () => {
  assert.match(route, /@\/widgets\/admin-gis/)
  assert.doesNotMatch(route, /fetch\(/)
  assert.doesNotMatch(route, /GisBoundaryMap/)

  assert.match(page, /\/api\/areas\?areaType=province/)
  assert.match(page, /\/api\/areas\?areaType=district/)
  assert.match(page, /\/api\/areas\/\$\{area\.id\}\/contacts/)
  assert.match(page, /\/api\/areas\/\$\{area\.id\}\/incidents/)
  assert.match(page, /GisBoundaryMap/)
  assert.match(page, /from ['"]\.\/gis-boundary-map['"]/)
  assert.match(page, /import\(['"]\.\/gis-boundary-map['"]\)/)
  assert.doesNotMatch(page, /@\/components\/admin\/gis-boundary-map/)
  assert.doesNotMatch(page, /@\/widgets\/admin-gis/)

  assert.doesNotMatch(page, /app\.post\("\/api\/areas"/)
  assert.doesNotMatch(page, /app\.put\("\/api\/areas\/:id"/)
  assert.doesNotMatch(page, /app\.delete\("\/api\/areas\/:id"/)
  assert.doesNotMatch(page, /วาดพื้นที่|แก้ไขขอบเขต|ลบขอบเขต|เพิ่มขอบเขต/)
})

test('gis page uses admin i18n and localized boundary names', () => {
  assert.match(page, /useAdminI18n/)
  assert.match(page, /buildAdminCategoryCollections\(referenceCategories, preferThai\)/)
  assert.match(page, /getProvinceDisplayName\(province, preferThai\)/)
  assert.match(page, /getDistrictDisplayName\(area, preferThai\)/)
  assert.match(page, /getAreaDisplayName\(selectedArea, preferThai\)/)
  assert.match(page, /from ['"]@\/entities\/area['"]/)
  assert.match(page, /t\(["']gisPageTitle["']\)/)
  assert.match(page, /t\(["']gisNoContacts["']\)/)
  assert.match(page, /t\(["']gisNoIncidents["']\)/)

  assert.doesNotMatch(page, />พื้นที่ GIS</)
  assert.doesNotMatch(page, /placeholder="ค้นหาจังหวัด หรือ อำเภอ\/เขต"/)
  assert.doesNotMatch(page, /ไม่พบเบอร์ในพื้นที่นี้/)
  assert.doesNotMatch(page, /ไม่พบเหตุการณ์ในพื้นที่นี้/)
})

test('gis map receives localized labels for tooltip and popup content', () => {
  assert.match(page, /preferThai=\{preferThai\}/)
  assert.match(page, /categoryLabels=\{categoryLabels\}/)
  assert.match(page, /contactFallbackLabel=\{t\(["']gisContactPopupFallback["']\)\}/)
  assert.match(page, /areaFallbackLabel=\{t\(["']gisAreaPopupFallback["']\)\}/)
  assert.match(page, /statusLabels=\{\{/)
  assert.match(page, /severityLabels=\{\{/)

  assert.match(map, /preferThai/)
  assert.match(map, /categoryLabels/)
  assert.match(map, /areaFallbackLabel/)
  assert.match(map, /statusLabels/)
  assert.match(map, /severityLabels/)
  assert.match(map, /buildAreaFeatureCollection\(areas, preferThai\)/)
  assert.match(map, /getAreaIncidentSeverityColor\(incident\.severity\)/)
  assert.match(widget, /GisBoundaryMap/)
  assert.match(widget, /GisBoundary/)
  assert.match(widget, /GisPage/)
  assert.match(areaEntity, /export \* from '\.\/lib\/features\.ts'/)
})

test('admin i18n dictionary contains gis translations in Thai and English', () => {
  assert.match(i18n, /gisPageTitle: "พื้นที่ GIS"/)
  assert.match(i18n, /gisPageTitle: "GIS areas"/)
  assert.match(i18n, /gisNoContacts: "ไม่พบเบอร์ในพื้นที่นี้"/)
  assert.match(i18n, /gisNoContacts: "No contacts found in this area"/)
})

test('gis district list card does not stretch taller than its scroll list', () => {
  assert.match(page, /<Card className="self-start">/)
  assert.match(page, /max-h-\[520px\]/)

  assert.doesNotMatch(page, /max-h-\[420px\]/)
})

test('gis search auto-select does not override manual area clicks', () => {
  assert.match(page, /setSelectedArea\(filteredDistricts\[0\]\)/)
  assert.match(page, /\[filteredDistricts, isDistrictLoading, searchTerm\]\)/)

  assert.doesNotMatch(page, /\[filteredDistricts, isDistrictLoading, searchTerm, selectedArea\?\.id\]/)
})

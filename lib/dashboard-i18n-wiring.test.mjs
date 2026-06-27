import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const dashboardPage = readFileSync('app/admin/(dashboard)/dashboard/page.tsx', 'utf8')
const i18n = readFileSync('lib/admin-i18n.tsx', 'utf8')

test('dashboard page uses admin i18n for visible dashboard copy', () => {
  assert.match(dashboardPage, /useAdminI18n/)
  assert.match(dashboardPage, /t\(["']dashboardRealtimeDebug["']\)/)
  assert.match(dashboardPage, /t\(["']dashboardReload["']\)/)
  assert.match(dashboardPage, /t\(["']dashboardMapTitle["']\)/)
  assert.match(dashboardPage, /t\(["']dashboardAdditionalViews["']\)/)
  assert.match(dashboardPage, /buildAdminCategoryCollections\(referenceCategories, preferThai\)/)
  assert.match(dashboardPage, /useLocationLookupMaps/)
  assert.match(dashboardPage, /localizedVisibleIncidents/)
  assert.match(dashboardPage, /getLocationDisplayName\(provinceByCode\[/)
  assert.match(dashboardPage, /getLocationDisplayName\(districtByCode\[/)

  assert.doesNotMatch(dashboardPage, />Realtime Debug</)
  assert.doesNotMatch(dashboardPage, />โหลดใหม่</)
  assert.doesNotMatch(dashboardPage, />แผนที่เหตุการณ์ตามสิทธิ์</)
})

test('admin i18n dictionary contains dashboard translations in Thai and English', () => {
  assert.match(i18n, /dashboardRealtimeDebug: "Realtime Debug"/)
  assert.match(i18n, /dashboardReload: "Reload"/)
  assert.match(i18n, /dashboardMapTitle: "Role-scoped incident map"/)
  assert.match(i18n, /dashboardAdditionalViews: "Additional views"/)
  assert.match(i18n, /dashboardOutsideArea: "Outside managed area"/)
})

import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const dashboardPage = readFileSync('app/admin/(dashboard)/dashboard/page.tsx', 'utf8')
const dashboardMapWidget = readFileSync('widgets/dashboard-map/index.ts', 'utf8')
const dashboardMapSection = readFileSync('widgets/dashboard-map/ui/dashboard-map-section.tsx', 'utf8')
const dashboardMapViewModel = readFileSync('widgets/dashboard-map/model/view-model.ts', 'utf8')
const i18n = [
  readFileSync('shared/i18n/admin/admin-i18n-context.tsx', 'utf8'),
  readFileSync('shared/i18n/admin/dictionaries/th.ts', 'utf8'),
  readFileSync('shared/i18n/admin/dictionaries/en.ts', 'utf8'),
].join('\n')

test('dashboard page uses admin i18n for visible dashboard copy', () => {
  assert.match(dashboardPage, /useAdminI18n/)
  assert.match(dashboardPage, /DashboardMapSection/)
  assert.match(dashboardPage, /t=\{t\}/)
  assert.match(dashboardPage, /buildAdminCategoryCollections\(referenceCategories, preferThai\)/)
  assert.match(dashboardPage, /useLocationLookupMaps/)
  assert.match(dashboardPage, /from ['"]@\/widgets\/dashboard-map['"]/)
  assert.doesNotMatch(dashboardPage, /@\/components\/admin\/incident-map/)
  assert.doesNotMatch(dashboardPage, /@\/components\/admin\/incident-queue/)
  assert.doesNotMatch(dashboardPage, /@\/components\/admin\/incident-detail-panel/)

  assert.match(dashboardMapSection, /t\(["']dashboardReload["']\)/)
  assert.match(dashboardMapSection, /t\(["']dashboardMapTitle["']\)/)
  assert.match(dashboardMapSection, /t\(["']dashboardAdditionalViews["']\)/)
  assert.match(dashboardMapSection, /buildDashboardLocationOptions\(provinces, districts, preferThai\)/)
  assert.match(dashboardMapSection, /buildDashboardMapViewModel\(/)
  assert.match(dashboardMapViewModel, /filterDashboardMapIncidents\(/)
  assert.match(dashboardMapViewModel, /localizeDashboardMapIncidents\(/)
  assert.match(dashboardMapWidget, /export \* from '\.\/lib\/helpers\.ts'/)
  assert.match(dashboardMapWidget, /export \* from '\.\/ui\/dashboard-map-section\.tsx'/)

  assert.doesNotMatch(dashboardPage, />Realtime Debug</)
  assert.doesNotMatch(dashboardPage, />โหลดใหม่</)
  assert.doesNotMatch(dashboardPage, />แผนที่เหตุการณ์ตามสิทธิ์</)
})

test('admin i18n dictionary contains dashboard translations in Thai and English', () => {
  assert.match(i18n, /dashboardReload: "Reload"/)
  assert.match(i18n, /dashboardMapTitle: "Role-scoped incident map"/)
  assert.match(i18n, /dashboardAdditionalViews: "Additional views"/)
  assert.match(i18n, /dashboardOutsideArea: "Outside managed area"/)
})

test('dashboard does not render the realtime debug card because settings owns SSE status', () => {
  assert.doesNotMatch(dashboardPage, /dashboardRealtimeDebug/)
  assert.doesNotMatch(dashboardPage, /smart-emergency:sse-status/)
  assert.doesNotMatch(dashboardPage, /smart-emergency:sse-event/)
  assert.doesNotMatch(dashboardPage, /events: \{sseEventCount\}/)
})

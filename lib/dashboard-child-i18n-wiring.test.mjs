import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const queueBridge = readFileSync('components/admin/incident-queue.tsx', 'utf8')
const queue = readFileSync('widgets/dashboard-map/ui/incident-queue.tsx', 'utf8')
const detailPanel = readFileSync('components/admin/incident-detail-panel.tsx', 'utf8')
const incidentMap = readFileSync('components/admin/incident-map.tsx', 'utf8')
const dashboardMapWidget = readFileSync('widgets/dashboard-map/index.ts', 'utf8')
const dashboardMapSection = readFileSync('widgets/dashboard-map/ui/dashboard-map-section.tsx', 'utf8')
const i18n = readFileSync('lib/admin-i18n.tsx', 'utf8')

test('dashboard child components use admin i18n for queue and detail labels', () => {
  assert.match(queue, /useAdminI18n/)
  assert.match(queue, /t\(["']incidentQueueTitle["']\)/)
  assert.match(queue, /t\(["']incidentQueueLoading["']\)/)
  assert.match(queue, /getIncidentTrackingStatusMeta/)
  assert.match(queue, /language === 'en' \? meta\.label : meta\.labelTh/)
  assert.match(queue, /caseNumber/)

  assert.match(detailPanel, /useAdminI18n/)
  assert.match(detailPanel, /t\(["']incidentDetailTitle["']\)/)
  assert.match(detailPanel, /t\(["']incidentDetailRetry["']\)/)
  assert.match(detailPanel, /workflowStatusLabel/)
  assert.match(detailPanel, /useLocationLookupMaps/)
  assert.match(detailPanel, /caseNumber/)

  assert.match(incidentMap, /useAdminI18n/)
  assert.match(incidentMap, /categoryLabels/)
  assert.match(incidentMap, /caseNumber/)
  assert.match(incidentMap, /getIncidentMapDisplayNumber\(incident\)/)
  assert.match(incidentMap, /from ['"]@\/widgets\/dashboard-map['"]/)
  assert.match(queueBridge, /@\/widgets\/dashboard-map\/ui\/incident-queue/)
  assert.match(queueBridge, /export \{ IncidentQueue \}/)
  assert.match(queueBridge, /export type \{ IncidentQueueItem, IncidentQueueProps \}/)
  assert.match(dashboardMapWidget, /export \* from '\.\/lib\/helpers\.ts'/)
  assert.match(dashboardMapWidget, /export \* from '\.\/ui\/dashboard-map-section\.tsx'/)
  assert.match(dashboardMapWidget, /export \* from '\.\/ui\/incident-queue\.tsx'/)
  assert.match(dashboardMapSection, /from ['"]\.\/incident-queue['"]/)
  assert.doesNotMatch(dashboardMapSection, /@\/components\/admin\/incident-queue/)
  assert.match(dashboardMapSection, /IncidentQueue/)
  assert.match(dashboardMapSection, /IncidentDetailPanel/)
  assert.match(dashboardMapSection, /IncidentMap/)
  assert.match(incidentMap, /t\(["']incidentMapStatusLabel["']\)/)
  assert.match(incidentMap, /t\(["']incidentMapAreaLabel["']\)/)

  assert.doesNotMatch(queue, />คิวเหตุการณ์</)
  assert.doesNotMatch(detailPanel, />รายละเอียดเหตุการณ์</)
  assert.doesNotMatch(incidentMap, /สถานะ:/)
  assert.doesNotMatch(incidentMap, /พื้นที่:/)
})

test('admin i18n dictionary contains dashboard child component translations', () => {
  assert.match(i18n, /incidentQueueTitle: "Incident queue"/)
  assert.match(i18n, /incidentDetailTitle: "Incident details"/)
  assert.match(i18n, /incidentDetailRetry: "Try again"/)
  assert.match(i18n, /incidentMapStatusLabel: "Status"/)
  assert.match(i18n, /incidentMapAreaLabel: "Area"/)
})

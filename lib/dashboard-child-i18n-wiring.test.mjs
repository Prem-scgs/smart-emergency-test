/**
 * ???? child components ??? dashboard map ???? queue/detail/timeline ?????? admin i18n.
 */
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const queue = readFileSync('widgets/dashboard-map/ui/incident-queue.tsx', 'utf8')
const detailPanel = readFileSync('widgets/dashboard-map/ui/incident-detail-panel.tsx', 'utf8')
const detailHelper = readFileSync('widgets/dashboard-map/lib/incident-detail.ts', 'utf8')
const statusTimeline = readFileSync('widgets/dashboard-map/ui/incident-status-timeline.tsx', 'utf8')
const incidentMap = readFileSync('widgets/dashboard-map/ui/incident-map.tsx', 'utf8')
const dashboardMapWidget = readFileSync('widgets/dashboard-map/index.ts', 'utf8')
const dashboardMapSection = readFileSync('widgets/dashboard-map/ui/dashboard-map-section.tsx', 'utf8')
const dashboardMapTypes = readFileSync('widgets/dashboard-map/model/types.ts', 'utf8')
const i18n = [
  readFileSync('shared/i18n/admin/admin-i18n-context.tsx', 'utf8'),
  readFileSync('shared/i18n/admin/dictionaries/th.ts', 'utf8'),
  readFileSync('shared/i18n/admin/dictionaries/en.ts', 'utf8'),
].join('\n')

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
  assert.match(detailPanel, /getIncidentDetailStatusLabel/)
  assert.match(detailPanel, /getIncidentDetailStatusChoices/)
  assert.match(detailPanel, /getIncidentDetailDisplayNumber/)
  assert.match(detailPanel, /buildIncidentStatusUpdateRequest/)
  assert.match(detailPanel, /useLocationLookupMaps/)
  assert.match(detailPanel, /from ['"]\.\/incident-status-timeline['"]/)
  assert.match(detailHelper, /export interface IncidentDetailTrackingIncident/)
  assert.match(detailHelper, /export function getIncidentDetailStatusChoices/)
  assert.match(detailHelper, /export function buildIncidentStatusUpdateRequest/)
  assert.match(detailHelper, /caseNumber/)
  assert.match(statusTimeline, /useAdminI18n/)
  assert.match(statusTimeline, /buildIncidentTrackingSteps/)
  assert.match(statusTimeline, /incidentTimelineCurrent/)
  assert.doesNotMatch(detailPanel, /@\/components\/admin\/incident-status-timeline/)

  assert.match(incidentMap, /useAdminI18n/)
  assert.match(incidentMap, /categoryLabels/)
  assert.match(incidentMap, /caseNumber/)
  assert.match(incidentMap, /getIncidentMapDisplayNumber\(incident\)/)
  assert.match(incidentMap, /MapViewport/)
  assert.match(incidentMap, /navigator\.geolocation/)
  assert.match(incidentMap, /map\.flyTo/)
  assert.match(incidentMap, /map\.fitBounds/)
  assert.match(incidentMap, /selectedIncidentId === incident\.id \? 'size-6 ring-4' : 'size-5 ring-2'/)
  assert.match(dashboardMapWidget, /export \* from '\.\/lib\/helpers\.ts'/)
  assert.match(dashboardMapWidget, /export \* from '\.\/lib\/incident-detail\.ts'/)
  assert.match(dashboardMapWidget, /export \* from '\.\/ui\/dashboard-map-section\.tsx'/)
  assert.match(dashboardMapWidget, /export \* from '\.\/ui\/incident-detail-panel\.tsx'/)
  assert.match(dashboardMapWidget, /export \* from '\.\/ui\/incident-status-timeline\.tsx'/)
  assert.match(dashboardMapWidget, /export \* from '\.\/ui\/incident-map\.tsx'/)
  assert.match(dashboardMapWidget, /export \* from '\.\/ui\/incident-queue\.tsx'/)
  assert.match(dashboardMapSection, /from ['"]\.\/incident-queue['"]/)
  assert.match(dashboardMapSection, /from ['"]\.\/incident-detail-panel['"]/)
  assert.match(dashboardMapSection, /import\('\.\/incident-map'\)/)
  assert.doesNotMatch(dashboardMapSection, /@\/components\/admin\/incident-queue/)
  assert.doesNotMatch(dashboardMapSection, /@\/components\/admin\/incident-map/)
  assert.doesNotMatch(dashboardMapSection, /@\/components\/admin\/incident-detail-panel/)
  assert.doesNotMatch(dashboardMapTypes, /@\/components\/admin\/incident-map/)
  assert.match(dashboardMapTypes, /from ['"]\.\.\/ui\/incident-map['"]/)
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

import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const notificationContextPath = new URL(
  '../features/incident-alert/model/notification-context.tsx',
  import.meta.url
)
const adminRootLayoutPath = new URL('../app/admin/layout.tsx', import.meta.url)
const adminLayoutPath = new URL('../widgets/admin-shell/ui/admin-layout-client.tsx', import.meta.url)
const incidentAlertTypesPath = new URL('../features/incident-alert/model/types.ts', import.meta.url)

test('admin mounts the canonical SSE hook only in NotificationProvider', async () => {
  const [notificationContext, adminLayout, adminRootLayout] = await Promise.all([
    readFile(notificationContextPath, 'utf8'),
    readFile(adminLayoutPath, 'utf8'),
    readFile(adminRootLayoutPath, 'utf8'),
  ])

  assert.match(notificationContext, /import \{ useSse \} from ['"]\.\/use-sse['"]/)
  assert.match(notificationContext, /useSse\(\{[\s\S]*onNotification: addNotification,[\s\S]*onAlert: addAlert,/)
  assert.match(notificationContext, /formatAreaText: formatIncidentAreaText/)
  assert.match(notificationContext, /const \{ language \} = useAdminI18n\(\)/)
  assert.match(notificationContext, /language,/)
  assert.match(
    adminRootLayout,
    /import \{ NotificationProvider \} from ['"]@\/features\/incident-alert\/model\/notification-context['"]/
  )
  assert.doesNotMatch(notificationContext, /WebSocket/)
  assert.doesNotMatch(adminLayout, /useSse/)
})

test('admin realtime alert formats area names from localized reference lookups', async () => {
  const notificationContext = await readFile(notificationContextPath, 'utf8')

  assert.match(notificationContext, /useLocationLookupMaps/)
  assert.match(notificationContext, /getLocationDisplayName\(province, preferThai\)/)
  assert.match(notificationContext, /getLocationDisplayName\(district, preferThai\)/)
  assert.match(notificationContext, /payload\.provinceCode \? provinceByCode\[payload\.provinceCode\]/)
  assert.match(notificationContext, /payload\.districtCode \? districtByCode\[payload\.districtCode\]/)
})

test('admin realtime alert shell uses admin i18n labels', async () => {
  const alertDisplay = await readFile(new URL('../components/admin/alert-display.tsx', import.meta.url), 'utf8')

  assert.match(alertDisplay, /const \{ t \} = useAdminI18n\(\)/)
  assert.match(alertDisplay, /t\('alertNewIncidentBadge'\)/)
  assert.match(alertDisplay, /t\('alertLatest'\)/)
  assert.match(alertDisplay, /t\('alertClose'\)/)
})

test('realtime event type uses SSE terminology without a WebSocket alias', async () => {
  const types = await readFile(incidentAlertTypesPath, 'utf8')

  assert.match(types, /export interface SseEvent\s*\{/)
  assert.doesNotMatch(types, /WebSocketEvent/)
})

test('admin realtime requires authenticated admin state before opening SSE', async () => {
  const [notificationContext, adminLayout] = await Promise.all([
    readFile(notificationContextPath, 'utf8'),
    readFile(adminLayoutPath, 'utf8'),
  ])

  assert.match(notificationContext, /const \{ user, isAuthenticated, isLoading \} = useAuth\(\)/)
  assert.match(notificationContext, /enabled: !isLoading && isAuthenticated && !!user,/)
  assert.match(adminLayout, /router\.replace\('\/admin'\)/)
  assert.match(adminLayout, /if \(!isAuthenticated \|\| !user\)/)
})

test('admin realtime uses the dedicated SSE helper and REST polling helper', async () => {
  const source = await readFile(
    new URL('../features/incident-alert/model/use-sse.ts', import.meta.url),
    'utf8'
  )

  assert.match(source, /new EventSource\(buildAdminEventsUrl\(getEmergencyApiEventsBaseUrl\(\), user\)\)/)
  assert.match(source, /buildRealtimeApiUrl\(getEmergencyApiBaseUrl\(\), `\/api\/incidents\/recent\?\$\{searchParams\.toString\(\)\}`\)/)
})

test('admin alert detail action opens the existing dashboard incident detail panel', async () => {
  const [alertDisplay, alertFeature, dashboardMapHooks, types] = await Promise.all([
    readFile(new URL('../components/admin/alert-display.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../features/incident-alert/lib/navigation.ts', import.meta.url), 'utf8'),
    readFile(new URL('../widgets/dashboard-map/model/hooks.ts', import.meta.url), 'utf8'),
    readFile(incidentAlertTypesPath, 'utf8'),
  ])

  assert.match(types, /incidentId\?: string/)
  assert.match(alertDisplay, /clearAlert\(currentAlert\.id\)[\s\S]*window\.setTimeout\(\(\) =>/)
  assert.match(alertDisplay, /openIncidentDetailFromAlert\(incidentId\)/)
  assert.match(alertFeature, /smart-emergency:pending-incident-detail/)
  assert.match(dashboardMapHooks, /smart-emergency:open-incident-detail/)
  assert.match(dashboardMapHooks, /openIncidentDetail\(incidentId\)/)
})
test('admin realtime alert carries incidentId for detail action', async () => {
  const source = await readFile(new URL('../features/incident-alert/lib/artifacts.ts', import.meta.url), 'utf8')

  assert.match(source, /const alert: Alert = \{[\s\S]*incidentId: payload\.id/)
  assert.match(source, /caseNumber: payload\.caseNumber/)
})

test('incident detail panel clears stale tracking while switching incidents', async () => {
  const source = await readFile(new URL('../widgets/dashboard-map/ui/incident-detail-panel.tsx', import.meta.url), 'utf8')

  assert.match(source, /const activeIncidentIdRef = useRef<string \| null>\(null\)/)
  assert.match(source, /activeIncidentIdRef\.current = incidentId[\s\S]*setTracking\(null\)[\s\S]*setIsLoading\(true\)/)
  assert.match(source, /if \(activeIncidentIdRef\.current !== requestedIncidentId\) return[\s\S]*setTracking\(payload\)/)
  assert.match(source, /tracking\.incident\.status === 'closed' \?/)
  assert.match(source, /response\.status === 409[\s\S]*await loadTracking\(\)[\s\S]*setError\(t\('incidentStatusChangedByOther'\)\)/)
  assert.match(source, /await loadTracking\(\)[\s\S]*onStatusUpdated\(\)[\s\S]*toast\.success\(t\('incidentStatusUpdatedToast'\)\)/)
  assert.match(source, /smart-emergency:incident-status-updated/)
})

test('incident detail panel includes admin scope in tracking URL for viewer read-only access', async () => {
  const [source, helper] = await Promise.all([
    readFile(new URL('../widgets/dashboard-map/ui/incident-detail-panel.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../widgets/dashboard-map/lib/incident-detail.ts', import.meta.url), 'utf8'),
  ])

  assert.match(source, /buildIncidentDetailTrackingUrl\(API_BASE_URL, requestedIncidentId, user\)/)
  assert.match(source, /headers: buildAdminApiHeaders\(user\)/)
  assert.match(source, /getIncidentDetailStatusChoices\(adminRole, currentStatus\)/)
  assert.match(source, /buildIncidentStatusUpdateRequest\(\{[\s\S]*incident: tracking\.incident,[\s\S]*toStatus: status,[\s\S]*note,[\s\S]*user,/)
  assert.match(helper, /buildAdminApiUrl\(apiBaseUrl, `\/api\/incidents\/\$\{incidentId\}\/tracking`, user\)/)
  assert.match(helper, /\.\.\.buildAdminApiHeaders\(user\)/)
  assert.match(helper, /expectedVersion: incident\.statusVersion/)
  assert.match(helper, /if \(role === 'viewer'\) return \[\]/)
})


test('notification center renders Thai category labels and opens incident details', async () => {
  const [categoryUtils, notificationCenter] = await Promise.all([
    readFile(new URL('../shared/reference/emergency-category.ts', import.meta.url), 'utf8'),
    readFile(new URL('../widgets/admin-shell/ui/notification-center.tsx', import.meta.url), 'utf8'),
  ])

  assert.match(categoryUtils, /medical: 'แพทย์'/)
  assert.doesNotMatch(categoryUtils, /\?\?\?/)
  assert.match(notificationCenter, /useReferenceCategories/)
  assert.match(notificationCenter, /openIncidentDetailFromNotification\(incidentId\)/)
  assert.match(notificationCenter, /onOpenChange\(false\)[\s\S]*window\.setTimeout/)
})

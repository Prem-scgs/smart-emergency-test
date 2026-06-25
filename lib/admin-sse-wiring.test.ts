import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const notificationContextPath = new URL('./notification-context.tsx', import.meta.url)
const adminLayoutPath = new URL('../components/admin/admin-layout-client.tsx', import.meta.url)
const typesPath = new URL('./types.ts', import.meta.url)

test('admin mounts the canonical SSE hook only in NotificationProvider', async () => {
  const [notificationContext, adminLayout] = await Promise.all([
    readFile(notificationContextPath, 'utf8'),
    readFile(adminLayoutPath, 'utf8'),
  ])

  assert.match(notificationContext, /import \{ useSse \} from ['"]@\/lib\/use-sse['"]/)
  assert.match(notificationContext, /useSse\(\{[\s\S]*onNotification: addNotification,[\s\S]*onAlert: addAlert,/)
  assert.doesNotMatch(notificationContext, /WebSocket/)
  assert.doesNotMatch(adminLayout, /useSse/)
})

test('realtime event type uses SSE terminology without a WebSocket alias', async () => {
  const types = await readFile(typesPath, 'utf8')

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

test('admin realtime uses the dedicated admin SSE API base URL helper', async () => {
  const source = await readFile(new URL('./use-sse.ts', import.meta.url), 'utf8')

  assert.match(source, /getEmergencyApiEventsBaseUrl/)
  assert.doesNotMatch(source, /getEmergencyApiBaseUrl\(\)/)
})

test('admin alert detail action opens the existing dashboard incident detail panel', async () => {
  const [alertDisplay, dashboardPage, types] = await Promise.all([
    readFile(new URL('../components/admin/alert-display.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/admin/(dashboard)/dashboard/page.tsx', import.meta.url), 'utf8'),
    readFile(typesPath, 'utf8'),
  ])

  assert.match(types, /incidentId\?: string/)
  assert.match(alertDisplay, /clearAlert\(currentAlert\.id\)[\s\S]*window\.setTimeout\(\(\) =>/)
  assert.match(alertDisplay, /openIncidentDetailFromAlert\(incidentId\)/)
  assert.match(alertDisplay, /smart-emergency:pending-incident-detail/)
  assert.match(dashboardPage, /smart-emergency:open-incident-detail/)
  assert.match(dashboardPage, /openIncidentDetail\(incidentId\)/)
})
test('admin realtime alert carries incidentId for detail action', async () => {
  const source = await readFile(new URL('./use-sse.ts', import.meta.url), 'utf8')

  assert.match(source, /const alert: Alert = \{[\s\S]*incidentId: payload\.id/)
})

test('incident detail panel clears stale tracking while switching incidents', async () => {
  const source = await readFile(new URL('../components/admin/incident-detail-panel.tsx', import.meta.url), 'utf8')

  assert.match(source, /const activeIncidentIdRef = useRef<string \| null>\(null\)/)
  assert.match(source, /activeIncidentIdRef\.current = incidentId[\s\S]*setTracking\(null\)[\s\S]*setIsLoading\(true\)/)
  assert.match(source, /if \(activeIncidentIdRef\.current !== requestedIncidentId\) return[\s\S]*setTracking\(payload\)/)
  assert.match(source, /tracking\.incident\.status === 'closed' \?/)
})


test('notification center renders Thai category labels and opens incident details', async () => {
  const [categoryUtils, notificationCenter] = await Promise.all([
    readFile(new URL('./emergency-category-utils.ts', import.meta.url), 'utf8'),
    readFile(new URL('../components/admin/notification-center.tsx', import.meta.url), 'utf8'),
  ])

  assert.match(categoryUtils, /medical: 'แพทย์'/)
  assert.doesNotMatch(categoryUtils, /\?\?\?/)
  assert.match(notificationCenter, /useReferenceCategories/)
  assert.match(notificationCenter, /openIncidentDetailFromNotification\(incidentId\)/)
  assert.match(notificationCenter, /onOpenChange\(false\)[\s\S]*window\.setTimeout/)
})

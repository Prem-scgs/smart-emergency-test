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

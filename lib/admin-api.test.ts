/** Contract ของ admin API client หลังเปลี่ยนจาก browser-supplied scope เป็น JWT. */
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildAdminApiHeaders,
  buildAdminApiUrl,
  buildAdminEventsUrl,
  getBackendAdminScope,
} from '../shared/api/admin-api.ts'

test('getBackendAdminScope still derives UI workflow permissions from the authenticated profile', () => {
  const scope = getBackendAdminScope({
    id: 'user-viewer',
    email: 'viewer@example.com',
    name: 'Viewer',
    role: 'viewer',
    agencyId: 'medical',
    permissions: [],
    lastLogin: new Date(),
  })

  assert.deepEqual(scope, { role: 'viewer', category: 'medical' })
})

test('buildAdminApiHeaders sends the signed bearer token without spoofable scope headers', () => {
  const headers = buildAdminApiHeaders(null, 'signed.jwt')

  assert.deepEqual(headers, { Authorization: 'Bearer signed.jwt' })
  assert.equal('x-admin-role' in headers, false)
  assert.equal('x-admin-category' in headers, false)
})

test('buildAdminApiHeaders returns no authorization header without a session token', () => {
  assert.deepEqual(buildAdminApiHeaders(null, null), {})
})

test('buildAdminApiUrl no longer appends role or category query parameters', () => {
  const url = buildAdminApiUrl('/emergency-api', '/api/incidents/incident-1/tracking', null)

  assert.equal(url, '/emergency-api/api/incidents/incident-1/tracking')
})

test('buildAdminEventsUrl uses only the short-lived SSE ticket', () => {
  assert.equal(
    buildAdminEventsUrl('https://emer-api.scgs-ai.com', 'one-time-ticket'),
    'https://emer-api.scgs-ai.com/api/events?ticket=one-time-ticket',
  )
})

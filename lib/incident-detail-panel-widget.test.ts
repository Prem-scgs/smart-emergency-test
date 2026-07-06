import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildIncidentDetailTrackingUrl,
  buildIncidentStatusUpdateRequest,
  buildIncidentStatusUpdateBody,
  getIncidentDetailDisplayNumber,
  getIncidentDetailLocationText,
  getIncidentDetailStatusChoices,
  getIncidentDetailStatusLabel,
  getIncidentStatusUpdateError,
  isIncidentDetailBackwardTransition,
  shouldShowIncidentCloseWarning,
  type IncidentDetailTrackingIncident,
} from '../widgets/dashboard-map/lib/incident-detail.ts'

const incident: IncidentDetailTrackingIncident = {
  id: 'b863c8a0-83c9-4761-b97e-66e8842b74b7',
  caseNumber: 'POL-20260706-0002',
  category: 'police',
  status: 'dispatched',
  statusVersion: 7,
  description: 'Smoke near the market',
  dialedPhone: '191',
  agencyName: 'Police',
  provinceCode: '65',
  province: 'Fallback Province',
  districtCode: '6501',
  district: 'Fallback District',
  latitude: 16.82,
  longitude: 100.26,
  updatedAt: '2026-07-06T08:00:00.000Z',
}

test('incident detail display number prefers case number with short id fallback', () => {
  assert.equal(getIncidentDetailDisplayNumber(incident), 'POL-20260706-0002')
  assert.equal(
    getIncidentDetailDisplayNumber({ id: 'b863c8a0-83c9-4761-b97e-66e8842b74b7', caseNumber: null }),
    'b863c8a0'
  )
})

test('incident detail status label follows admin language', () => {
  assert.equal(getIncidentDetailStatusLabel('reported', 'en'), 'Reported')
  assert.equal(getIncidentDetailStatusLabel('reported', 'th'), 'แจ้งเหตุแล้ว')
})

test('incident detail location text prefers master locations before incident fallback', () => {
  assert.equal(
    getIncidentDetailLocationText({
      incident,
      provinceByCode: {
        '65': { name: 'Phitsanulok', nameTh: 'พิษณุโลก', nameEn: 'Phitsanulok' },
      },
      districtByCode: {
        '6501': { name: 'Mueang Phitsanulok', nameTh: 'เมืองพิษณุโลก', nameEn: 'Mueang Phitsanulok' },
      },
      preferThai: true,
      fallback: 'ไม่ระบุพื้นที่',
    }),
    'เมืองพิษณุโลก พิษณุโลก'
  )

  assert.equal(
    getIncidentDetailLocationText({
      incident: { ...incident, provinceCode: null, districtCode: null },
      provinceByCode: {},
      districtByCode: {},
      preferThai: false,
      fallback: 'No area',
    }),
    'Fallback District Fallback Province'
  )
})

test('incident detail status choices preserve viewer, agency, and super admin rules', () => {
  assert.deepEqual(getIncidentDetailStatusChoices('viewer', 'reported'), [])
  assert.deepEqual(getIncidentDetailStatusChoices('agency_admin', 'dispatched'), ['on_scene'])
  assert.deepEqual(getIncidentDetailStatusChoices('super_admin', 'on_scene'), [
    'closed',
    'reported',
    'acknowledged',
    'coordinating',
    'dispatched',
  ])
})

test('incident detail close warning and backward note rules match current behavior', () => {
  assert.equal(shouldShowIncidentCloseWarning('closed', ''), true)
  assert.equal(shouldShowIncidentCloseWarning('closed', 'summary'), false)
  assert.equal(isIncidentDetailBackwardTransition('closed', 'on_scene'), true)
  assert.equal(isIncidentDetailBackwardTransition('on_scene', 'closed'), false)
})

test('incident detail status update body keeps expected version and normalized note', () => {
  assert.deepEqual(buildIncidentStatusUpdateBody(incident, 'on_scene', '  arrived  '), {
    fromStatus: 'dispatched',
    toStatus: 'on_scene',
    expectedVersion: 7,
    note: 'arrived',
  })
  assert.deepEqual(buildIncidentStatusUpdateBody(incident, 'on_scene', '   '), {
    fromStatus: 'dispatched',
    toStatus: 'on_scene',
    expectedVersion: 7,
    note: null,
  })
})

test('incident detail request helpers preserve admin scope headers and tracking URL scope', () => {
  const viewer = {
    id: 'viewer-1',
    email: 'viewer@example.com',
    name: 'Viewer',
    role: 'viewer' as const,
    agencyId: 'agency-police',
    permissions: [],
    lastLogin: new Date(),
  }

  assert.equal(
    buildIncidentDetailTrackingUrl('/emergency-api', incident.id, viewer),
    `/emergency-api/api/incidents/${incident.id}/tracking?role=viewer&category=police`
  )

  const request = buildIncidentStatusUpdateRequest({
    apiBaseUrl: 'http://localhost:4000',
    incident,
    toStatus: 'on_scene',
    note: ' arrived ',
    user: viewer,
  })

  assert.equal(request.url, `http://localhost:4000/api/incidents/${incident.id}/status`)
  assert.equal(request.init.method, 'PATCH')
  assert.deepEqual(request.init.headers, {
    'Content-Type': 'application/json',
    'x-admin-role': 'viewer',
    'x-admin-category': 'police',
  })
  assert.equal(
    request.init.body,
    JSON.stringify({
      fromStatus: 'dispatched',
      toStatus: 'on_scene',
      expectedVersion: 7,
      note: 'arrived',
    })
  )
})

test('incident detail update error parser falls back when response has no error string', () => {
  assert.equal(getIncidentStatusUpdateError({ error: 'Rejected' }, 'Fallback'), 'Rejected')
  assert.equal(getIncidentStatusUpdateError({ error: 400 }, 'Fallback'), 'Fallback')
  assert.equal(getIncidentStatusUpdateError(null, 'Fallback'), 'Fallback')
})

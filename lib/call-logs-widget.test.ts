import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { ApiIncident } from '../widgets/admin-call-logs/model/types.ts'
import { escapeCsvCell, getCallStatus, getLocation } from '../widgets/admin-call-logs/lib/format.ts'

function createIncident(overrides: Partial<ApiIncident> = {}): ApiIncident {
  return {
    id: 'incident-1',
    category: 'medical',
    severity: 'medium',
    status: 'reported',
    description: null,
    agencyContactId: null,
    agencyName: null,
    agencyPhone: null,
    province: null,
    district: null,
    accuracy: null,
    callStatus: null,
    latitude: 18.78835,
    longitude: 98.98530,
    createdAt: '2026-07-08T10:00:00.000Z',
    updatedAt: '2026-07-08T10:00:00.000Z',
    ...overrides,
  }
}

test('getCallStatus prefers explicit call status', () => {
  assert.equal(getCallStatus(createIncident({ callStatus: 'busy', status: 'closed' })), 'busy')
})

test('getCallStatus treats closed and acknowledged incidents as connected when call status is missing', () => {
  assert.equal(getCallStatus(createIncident({ status: 'closed' })), 'connected')
  assert.equal(getCallStatus(createIncident({ status: 'acknowledged' })), 'connected')
})

test('getCallStatus falls back to no-answer for active incidents without call status', () => {
  assert.equal(getCallStatus(createIncident({ status: 'reported' })), 'no-answer')
})

test('getLocation prefers district and province labels before coordinates', () => {
  assert.equal(
    getLocation(createIncident({ district: 'Mueang Chiang Mai', province: 'Chiang Mai' })),
    'Mueang Chiang Mai, Chiang Mai'
  )
})

test('getLocation falls back to fixed coordinate text', () => {
  assert.equal(getLocation(createIncident()), '18.78835, 98.98530')
})

test('escapeCsvCell quotes commas newlines and double quotes', () => {
  assert.equal(escapeCsvCell('plain'), 'plain')
  assert.equal(escapeCsvCell('Mueang, Chiang Mai'), '"Mueang, Chiang Mai"')
  assert.equal(escapeCsvCell('line\nbreak'), '"line\nbreak"')
  assert.equal(escapeCsvCell('say "hello"'), '"say ""hello"""')
})

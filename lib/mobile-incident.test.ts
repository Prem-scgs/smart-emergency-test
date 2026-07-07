import test from 'node:test'
import assert from 'node:assert/strict'

// @ts-ignore -- node --experimental-strip-types resolves the .ts module directly in this repo
import {
  buildIncidentCreatePayload,
  buildIncidentCallUpdatePayload,
  normalizeReporterPhone,
} from './mobile-incident.ts'
import type { EmergencyCategory } from '@/entities/incident'
import type { EmergencyContact } from './types'

const baseContact: EmergencyContact = {
  id: 'contact-1',
  agencyName: 'Emergency Medical Services',
  phoneNumber: '1669',
  category: 'medical',
  provinceCode: '65',
  province: 'Phitsanulok',
  districtCode: '6501',
  district: 'Mueang Phitsanulok',
  status: 'active',
  is24Hours: true,
}

const baseLocation = {
  latitude: 16.8369,
  longitude: 100.2365,
  accuracy: 25,
  provinceCode: '65',
  province: 'Phitsanulok',
  districtCode: '6501',
  district: 'Mueang Phitsanulok',
}

test('buildIncidentCreatePayload creates immediate alert payload when call starts', () => {
  const payload = buildIncidentCreatePayload({
    category: 'medical',
    contact: baseContact,
    location: baseLocation,
    sessionId: 'session-12345678',
    clientRequestId: '11111111-1111-4111-8111-111111111111',
  })

  assert.equal(payload.category, 'medical')
  assert.equal(payload.status, 'reported')
  assert.equal(payload.clientRequestId, '11111111-1111-4111-8111-111111111111')
  assert.equal(payload.dialedPhone, '1669')
  assert.equal(payload.callStatus, null)
  assert.equal(payload.agencyContactId, 'contact-1')
  assert.equal(payload.reporterPhone, null)
  assert.equal(payload.description, 'Call initiated via mobile app to Emergency Medical Services')
})

test('buildIncidentCallUpdatePayload updates the result without requiring reporter phone', () => {
  const payload = buildIncidentCallUpdatePayload({
    status: 'busy',
    contact: baseContact,
  })

  assert.equal(payload.callStatus, 'busy')
  assert.equal(payload.reporterPhone, null)
  assert.equal(payload.description, 'Call completed via mobile app to Emergency Medical Services (busy)')
})

test('normalizeReporterPhone returns null for blank values', () => {
  assert.equal(normalizeReporterPhone('  '), null)
})

test('normalizeReporterPhone keeps only digits', () => {
  assert.equal(normalizeReporterPhone('094-611-1111'), '0946111111')
})

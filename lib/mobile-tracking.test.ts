import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getMobileIncidentDisplayNumber,
  buildMobileIncidentEventsUrl,
  buildMobileTrackingUrl,
  isMobileIncidentWorkflowStatus,
} from '../shared/realtime/mobile-tracking.ts'

test('buildMobileTrackingUrl scopes tracking reads by incident and reporter session', () => {
  assert.equal(
    buildMobileTrackingUrl('http://localhost:4000', 'incident/123', 'session mobile 123'),
    'http://localhost:4000/api/incidents/incident%2F123/tracking?sessionId=session+mobile+123'
  )
})

test('buildMobileIncidentEventsUrl scopes realtime events by incident and reporter session', () => {
  assert.equal(
    buildMobileIncidentEventsUrl('http://localhost:4000', 'incident/123', 'session mobile 123'),
    'http://localhost:4000/api/incidents/incident%2F123/events?sessionId=session+mobile+123'
  )
})

test('tracking URLs support the relative emergency API proxy base', () => {
  assert.equal(
    buildMobileTrackingUrl('/emergency-api', 'incident/123', 'session mobile 123'),
    '/emergency-api/api/incidents/incident%2F123/tracking?sessionId=session+mobile+123'
  )
  assert.equal(
    buildMobileIncidentEventsUrl('/emergency-api', 'incident/123', 'session mobile 123'),
    '/emergency-api/api/incidents/incident%2F123/events?sessionId=session+mobile+123'
  )
})

test('isMobileIncidentWorkflowStatus accepts only the approved workflow', () => {
  assert.equal(isMobileIncidentWorkflowStatus('reported'), true)
  assert.equal(isMobileIncidentWorkflowStatus('on_scene'), true)
  assert.equal(isMobileIncidentWorkflowStatus('closed'), true)
  assert.equal(isMobileIncidentWorkflowStatus('open'), false)
  assert.equal(isMobileIncidentWorkflowStatus(undefined), false)
})

test('getMobileIncidentDisplayNumber prefers readable case number over UUID', () => {
  assert.equal(
    getMobileIncidentDisplayNumber({
      id: 'deccce88-0c16-4587-ac25-9b5827337c1b',
      caseNumber: 'EMS-20260704-0001',
    }),
    'EMS-20260704-0001'
  )
  assert.equal(
    getMobileIncidentDisplayNumber({
      id: 'deccce88-0c16-4587-ac25-9b5827337c1b',
    }),
    'deccce88'
  )
})

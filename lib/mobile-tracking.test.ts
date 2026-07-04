import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildMobileIncidentEventsUrl,
  buildMobileTrackingUrl,
  isMobileIncidentWorkflowStatus,
} from './mobile-tracking.ts'

test('buildMobileTrackingUrl scopes tracking reads by case number and token', () => {
  assert.equal(
    buildMobileTrackingUrl('http://localhost:4000', 'SE-260704-0007', 'tracking token 12345678901234567890'),
    'http://localhost:4000/api/incidents/SE-260704-0007/tracking?token=tracking+token+12345678901234567890'
  )
})

test('buildMobileIncidentEventsUrl scopes realtime events by case number and token', () => {
  assert.equal(
    buildMobileIncidentEventsUrl('http://localhost:4000', 'SE-260704-0007', 'tracking token 12345678901234567890'),
    'http://localhost:4000/api/incidents/SE-260704-0007/events?token=tracking+token+12345678901234567890'
  )
})

test('tracking URLs support the relative emergency API proxy base', () => {
  assert.equal(
    buildMobileTrackingUrl('/emergency-api', 'SE-260704-0007', 'tracking token 12345678901234567890'),
    '/emergency-api/api/incidents/SE-260704-0007/tracking?token=tracking+token+12345678901234567890'
  )
  assert.equal(
    buildMobileIncidentEventsUrl('/emergency-api', 'SE-260704-0007', 'tracking token 12345678901234567890'),
    '/emergency-api/api/incidents/SE-260704-0007/events?token=tracking+token+12345678901234567890'
  )
})

test('isMobileIncidentWorkflowStatus accepts only the approved workflow', () => {
  assert.equal(isMobileIncidentWorkflowStatus('reported'), true)
  assert.equal(isMobileIncidentWorkflowStatus('on_scene'), true)
  assert.equal(isMobileIncidentWorkflowStatus('closed'), true)
  assert.equal(isMobileIncidentWorkflowStatus('open'), false)
  assert.equal(isMobileIncidentWorkflowStatus(undefined), false)
})

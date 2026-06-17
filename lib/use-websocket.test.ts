import test from 'node:test'
import assert from 'node:assert/strict'

import { buildRealtimeIncidentArtifacts } from './use-websocket'

test('buildRealtimeIncidentArtifacts creates an alert for medium severity incidents', () => {
  const { notification, alert } = buildRealtimeIncidentArtifacts({
    id: 'incident-1',
    category: 'police',
    severity: 'medium',
    status: 'open',
    province: 'Bangkok',
    district: 'Pathum Wan',
    createdAt: '2026-06-15T14:40:00.000Z',
  })

  assert.equal(notification.type, 'new-incident')
  assert.equal(notification.title, 'มีเหตุใหม่เข้าระบบ')
  assert.equal(notification.agencyId, 'police')
  assert.ok(alert)
  assert.equal(alert?.severity, 'info')
  assert.equal(alert?.title, 'มีเหตุแจ้งเข้าใหม่')
  assert.equal(alert?.agencyId, 'police')
})

test('buildRealtimeIncidentArtifacts keeps critical severity incidents as critical alerts', () => {
  const { alert } = buildRealtimeIncidentArtifacts({
    id: 'incident-2',
    category: 'fire',
    severity: 'critical',
    status: 'open',
    areaName: 'Phra Nakhon',
    createdAt: '2026-06-15T14:40:00.000Z',
  })

  assert.ok(alert)
  assert.equal(alert?.severity, 'critical')
})

/**
 * ???? workflow status order/meta/progress ??? incident tracking ??? mobile/admin ??????????.
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildIncidentTrackingSteps,
  getNextIncidentTrackingStatus,
  getIncidentTrackingProgressPercent,
  getIncidentTrackingStatusMeta,
  isIncidentWorkflowStatus,
} from '../entities/incident/model/tracking.ts'

test('getIncidentTrackingStatusMeta returns approved Thai workflow copy', () => {
  assert.deepEqual(getIncidentTrackingStatusMeta('reported'), {
    label: 'Reported',
    labelTh: 'แจ้งเหตุแล้ว',
    description: 'ระบบบันทึกเหตุและกำลังรอหน่วยงานรับเรื่อง',
    descriptionEn: 'The incident has been recorded and is waiting for an agency response',
  })
})

test('buildIncidentTrackingSteps marks completed and active steps from backend workflow status', () => {
  const steps = buildIncidentTrackingSteps('coordinating', [
    { toStatus: 'reported', createdAt: '2026-06-19T10:00:00.000Z' },
    { toStatus: 'acknowledged', createdAt: '2026-06-19T10:02:00.000Z' },
    { toStatus: 'coordinating', createdAt: '2026-06-19T10:05:00.000Z' },
  ])

  assert.equal(steps[0]?.status, 'reported')
  assert.equal(steps[0]?.isCompleted, true)
  assert.equal(steps[1]?.status, 'acknowledged')
  assert.equal(steps[1]?.isCompleted, true)
  assert.equal(steps[2]?.status, 'coordinating')
  assert.equal(steps[2]?.isActive, true)
  assert.equal(steps[2]?.timestamp?.toISOString(), '2026-06-19T10:05:00.000Z')
  assert.equal(steps[3]?.isCompleted, false)
  assert.equal(steps[5]?.labelTh, 'ปิดเหตุ')
})

test('getIncidentTrackingProgressPercent follows six approved workflow steps', () => {
  assert.equal(getIncidentTrackingProgressPercent('reported'), 17)
  assert.equal(getIncidentTrackingProgressPercent('on_scene'), 83)
  assert.equal(getIncidentTrackingProgressPercent('closed'), 100)
})

test('getNextIncidentTrackingStatus returns the next approved status', () => {
  assert.equal(getNextIncidentTrackingStatus('reported'), 'acknowledged')
  assert.equal(getNextIncidentTrackingStatus('on_scene'), 'closed')
  assert.equal(getNextIncidentTrackingStatus('closed'), null)
})

test('isIncidentWorkflowStatus accepts only approved workflow statuses', () => {
  assert.equal(isIncidentWorkflowStatus('reported'), true)
  assert.equal(isIncidentWorkflowStatus('on_scene'), true)
  assert.equal(isIncidentWorkflowStatus('open'), false)
  assert.equal(isIncidentWorkflowStatus(undefined), false)
})

import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getAdminStatusChoices,
  requiresStatusReason,
} from './admin-status-controls.ts'

test('agency admin receives only the next status', () => {
  assert.deepEqual(getAdminStatusChoices('agency_admin', 'dispatched'), ['on_scene'])
})

test('agency admin receives no status after closure', () => {
  assert.deepEqual(getAdminStatusChoices('agency_admin', 'closed'), [])
})

test('super admin receives every status except the current status', () => {
  assert.deepEqual(getAdminStatusChoices('super_admin', 'closed'), [
    'reported',
    'acknowledged',
    'coordinating',
    'dispatched',
    'on_scene',
  ])
})

test('super admin receives forward choices before backward choices', () => {
  assert.deepEqual(getAdminStatusChoices('super_admin', 'on_scene'), [
    'closed',
    'reported',
    'acknowledged',
    'coordinating',
    'dispatched',
  ])
})

test('requires a reason only for backward changes', () => {
  assert.equal(requiresStatusReason('closed', 'on_scene'), true)
  assert.equal(requiresStatusReason('on_scene', 'closed'), false)
  assert.equal(requiresStatusReason('reported', 'acknowledged'), false)
})

import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getIncidentDisplayNumber,
  getUserFacingIncidentDescription,
  isMobileCallSystemDescription,
} from '../entities/incident/lib/display.ts'

test('hides mobile call system descriptions from user-facing UI', () => {
  assert.equal(isMobileCallSystemDescription('Call initiated via mobile app to test'), true)
  assert.equal(isMobileCallSystemDescription('Call completed via mobile app to test (busy)'), true)
  assert.equal(getUserFacingIncidentDescription('Call initiated via mobile app to test'), null)
  assert.equal(getUserFacingIncidentDescription('Call completed via mobile app to test (busy)'), null)
})

test('keeps real incident descriptions visible', () => {
  assert.equal(getUserFacingIncidentDescription('Smoke near the market'), 'Smoke near the market')
  assert.equal(getUserFacingIncidentDescription('  น้ำท่วมหน้าบ้าน  '), 'น้ำท่วมหน้าบ้าน')
  assert.equal(getUserFacingIncidentDescription(null), null)
})

test('getIncidentDisplayNumber prefers case number over full UUID', () => {
  assert.equal(
    getIncidentDisplayNumber({
      id: 'b863c8a0-83c9-4761-b97e-66e8842b74b7',
      caseNumber: 'POL-20260706-0002',
    }),
    'POL-20260706-0002'
  )
  assert.equal(
    getIncidentDisplayNumber({
      id: 'b863c8a0-83c9-4761-b97e-66e8842b74b7',
      caseNumber: null,
    }),
    'b863c8a0'
  )
})

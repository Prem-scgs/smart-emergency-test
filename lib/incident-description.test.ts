import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getUserFacingIncidentDescription,
  isMobileCallSystemDescription,
} from './incident-description.ts'

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

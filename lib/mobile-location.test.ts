/**
 * ???? helper location ??? mobile incident ???? status message/failure state.
 */
import assert from 'node:assert/strict'
import test from 'node:test'

// @ts-ignore -- executed by node with tsx from the backend workspace
import { getLocationFailureStatus } from '../features/mobile-incident/lib/location.ts'

test('maps permission denied', () => {
  assert.equal(getLocationFailureStatus(1), 'denied')
})

test('maps position unavailable', () => {
  assert.equal(getLocationFailureStatus(2), 'unavailable')
})

test('maps request timeout', () => {
  assert.equal(getLocationFailureStatus(3), 'timeout')
})

import assert from 'node:assert/strict'
import test from 'node:test'

// @ts-ignore -- executed by node with tsx from the backend workspace
import { getEmergencyApiBaseUrl } from './emergency-api-url.ts'

test('uses the same-origin emergency gateway by default', () => {
  assert.equal(
    getEmergencyApiBaseUrl({ origin: 'https://172.20.10.4:3000' }),
    '/emergency-api',
  )
})

test('uses the configured API URL when supplied', () => {
  assert.equal(
    getEmergencyApiBaseUrl(
      { origin: 'https://172.20.10.4:3000' },
      'https://api.example.com/',
    ),
    'https://api.example.com',
  )
})

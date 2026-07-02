import assert from 'node:assert/strict'
import test from 'node:test'

// @ts-ignore -- executed by node with tsx from the backend workspace
import { getEmergencyApiBaseUrl, getEmergencyApiEventsBaseUrl } from './emergency-api-url.ts'

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

test('admin SSE uses the configured SSE URL when supplied', () => {
  assert.equal(
    getEmergencyApiEventsBaseUrl(
      { origin: 'https://smart-emergency-test.vercel.app' },
      'https://api-tunnel.trycloudflare.com/',
    ),
    'https://api-tunnel.trycloudflare.com',
  )
})

test('admin SSE falls back to the configured API URL when no SSE URL is supplied', () => {
  const previousApiUrl = process.env.NEXT_PUBLIC_EMERGENCY_API_URL
  const previousSseUrl = process.env.NEXT_PUBLIC_EMERGENCY_SSE_URL
  const previousLegacyEventsUrl = process.env.NEXT_PUBLIC_EMERGENCY_API_EVENTS_URL

  try {
    process.env.NEXT_PUBLIC_EMERGENCY_API_URL = 'https://api-tunnel.trycloudflare.com/'
    delete process.env.NEXT_PUBLIC_EMERGENCY_SSE_URL
    delete process.env.NEXT_PUBLIC_EMERGENCY_API_EVENTS_URL

    assert.equal(
      getEmergencyApiEventsBaseUrl({ origin: 'https://smart-emergency-test.vercel.app' }),
      'https://api-tunnel.trycloudflare.com',
    )
  } finally {
    if (previousApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_EMERGENCY_API_URL
    } else {
      process.env.NEXT_PUBLIC_EMERGENCY_API_URL = previousApiUrl
    }

    if (previousSseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_EMERGENCY_SSE_URL
    } else {
      process.env.NEXT_PUBLIC_EMERGENCY_SSE_URL = previousSseUrl
    }

    if (previousLegacyEventsUrl === undefined) {
      delete process.env.NEXT_PUBLIC_EMERGENCY_API_EVENTS_URL
    } else {
      process.env.NEXT_PUBLIC_EMERGENCY_API_EVENTS_URL = previousLegacyEventsUrl
    }
  }
})

test('admin SSE falls back to Fastify localhost during local development', () => {
  assert.equal(
    getEmergencyApiEventsBaseUrl({ origin: 'http://localhost:3000' }, undefined),
    'http://localhost:4000',
  )
})

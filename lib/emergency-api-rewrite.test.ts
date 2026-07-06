import assert from 'node:assert/strict'
import test from 'node:test'

import nextConfig from '../next.config.mjs'

test('emergency gateway preserves the API path supplied by browser callers', async () => {
  const rewrites = await nextConfig.rewrites()
  const emergencyRewrite = rewrites.find((rewrite) => rewrite.source === '/emergency-api/:path*')

  assert.equal(emergencyRewrite?.destination.endsWith('/:path*'), true)
  assert.equal(emergencyRewrite?.destination.endsWith('/api/:path*'), false)
})

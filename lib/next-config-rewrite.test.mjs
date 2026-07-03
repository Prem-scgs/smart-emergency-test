import assert from 'node:assert/strict'
import test from 'node:test'

import nextConfig from '../next.config.mjs'

async function getEmergencyRewriteDestination() {
  const rewrites = await nextConfig.rewrites()
  const emergencyRewrite = rewrites.find((rewrite) => rewrite.source === '/emergency-api/:path*')
  return emergencyRewrite?.destination
}

test('rewrites emergency API requests to the local API by default', async () => {
  const previous = process.env.EMERGENCY_API_INTERNAL_URL
  delete process.env.EMERGENCY_API_INTERNAL_URL

  try {
    assert.equal(await getEmergencyRewriteDestination(), 'http://127.0.0.1:4000/:path*')
  } finally {
    if (previous === undefined) {
      delete process.env.EMERGENCY_API_INTERNAL_URL
    } else {
      process.env.EMERGENCY_API_INTERNAL_URL = previous
    }
  }
})

test('rewrites emergency API requests to the Docker internal API when configured', async () => {
  const previous = process.env.EMERGENCY_API_INTERNAL_URL
  process.env.EMERGENCY_API_INTERNAL_URL = 'http://api:4000/'

  try {
    assert.equal(await getEmergencyRewriteDestination(), 'http://api:4000/:path*')
  } finally {
    if (previous === undefined) {
      delete process.env.EMERGENCY_API_INTERNAL_URL
    } else {
      process.env.EMERGENCY_API_INTERNAL_URL = previous
    }
  }
})

test('rewrites emergency API requests to the external API alias when configured', async () => {
  const previousInternal = process.env.EMERGENCY_API_INTERNAL_URL
  const previousExternal = process.env.NEXT_PUBLIC_EMERGENCY_API_EXTERNAL_URL
  delete process.env.EMERGENCY_API_INTERNAL_URL
  process.env.NEXT_PUBLIC_EMERGENCY_API_EXTERNAL_URL = 'https://api-tunnel.trycloudflare.com/'

  try {
    assert.equal(await getEmergencyRewriteDestination(), 'https://api-tunnel.trycloudflare.com/:path*')
  } finally {
    if (previousInternal === undefined) {
      delete process.env.EMERGENCY_API_INTERNAL_URL
    } else {
      process.env.EMERGENCY_API_INTERNAL_URL = previousInternal
    }

    if (previousExternal === undefined) {
      delete process.env.NEXT_PUBLIC_EMERGENCY_API_EXTERNAL_URL
    } else {
      process.env.NEXT_PUBLIC_EMERGENCY_API_EXTERNAL_URL = previousExternal
    }
  }
})

test('Vercel rewrites prefer the external API alias over a private internal URL', async () => {
  const previousVercel = process.env.VERCEL
  const previousInternal = process.env.EMERGENCY_API_INTERNAL_URL
  const previousExternal = process.env.NEXT_PUBLIC_EMERGENCY_API_EXTERNAL_URL
  process.env.VERCEL = '1'
  process.env.EMERGENCY_API_INTERNAL_URL = 'http://api:4000/'
  process.env.NEXT_PUBLIC_EMERGENCY_API_EXTERNAL_URL = 'https://api-tunnel.trycloudflare.com/'

  try {
    assert.equal(await getEmergencyRewriteDestination(), 'https://api-tunnel.trycloudflare.com/:path*')
  } finally {
    if (previousVercel === undefined) {
      delete process.env.VERCEL
    } else {
      process.env.VERCEL = previousVercel
    }

    if (previousInternal === undefined) {
      delete process.env.EMERGENCY_API_INTERNAL_URL
    } else {
      process.env.EMERGENCY_API_INTERNAL_URL = previousInternal
    }

    if (previousExternal === undefined) {
      delete process.env.NEXT_PUBLIC_EMERGENCY_API_EXTERNAL_URL
    } else {
      process.env.NEXT_PUBLIC_EMERGENCY_API_EXTERNAL_URL = previousExternal
    }
  }
})

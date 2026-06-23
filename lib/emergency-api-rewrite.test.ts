import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const configUrl = new URL('../next.config.mjs', import.meta.url)

test('emergency gateway preserves the API path supplied by browser callers', async () => {
  const source = await readFile(configUrl, 'utf8')

  assert.match(source, /destination: 'http:\/\/127\.0\.0\.1:4000\/:path\*'/)
  assert.doesNotMatch(source, /destination: 'http:\/\/127\.0\.0\.1:4000\/api\/:path\*'/)
})

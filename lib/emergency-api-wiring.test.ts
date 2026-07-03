import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const runtimeFiles = [
  'lib/use-sse.ts',
  'app/admin/(dashboard)/gis/page.tsx',
  'app/admin/(dashboard)/contacts/page.tsx',
  'app/admin/(dashboard)/dashboard/page.tsx',
  'app/admin/(dashboard)/call-logs/page.tsx',
  'components/admin/incident-detail-panel.tsx',
]
const projectRoot = new URL('../', import.meta.url)

test('browser runtime does not hard-code the Fastify localhost origin', async () => {
  for (const file of runtimeFiles) {
    const source = await readFile(new URL(file, projectRoot), 'utf8')
    assert.doesNotMatch(source, /http:\/\/localhost:4000/, file)
  }
})

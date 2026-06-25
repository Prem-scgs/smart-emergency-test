import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('select popup is layered above app dialogs', async () => {
  const source = await readFile(new URL('../components/ui/select.tsx', import.meta.url), 'utf8')
  assert.match(source, /z-\[1200\]/)
})

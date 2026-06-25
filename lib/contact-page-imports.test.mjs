import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const page = readFileSync(
  'app/admin/(dashboard)/contacts/page.tsx',
  'utf8'
)

test('contacts page imports phone helpers used by saveContact', () => {
  assert.match(page, /isValidContactPhone/)
  assert.match(page, /normalizeContactPhone/)
  assert.match(
    page,
    /import \{[\s\S]*isValidContactPhone[\s\S]*normalizeContactPhone[\s\S]*\} from '@\/lib\/contact-coverage'/
  )
})

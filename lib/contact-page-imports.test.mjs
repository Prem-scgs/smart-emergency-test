import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const page = readFileSync(
  'app/admin/(dashboard)/contacts/page.tsx',
  'utf8'
)
const contactEntity = readFileSync('entities/contact/index.ts', 'utf8')

test('contacts page imports phone helpers used by saveContact', () => {
  assert.match(page, /isValidContactPhone/)
  assert.match(page, /normalizeContactPhone/)
  assert.match(
    page,
    /import \{[\s\S]*isValidContactPhone[\s\S]*normalizeContactPhone[\s\S]*\} from '@\/lib\/contact-coverage'/
  )
})

test('contact entity owns the FSD-lite helper exports while lib remains the bridge', () => {
  assert.match(contactEntity, /export \* from '\.\/model\/coverage(?:\.ts)?'/)
  assert.match(contactEntity, /export \* from '\.\/lib\/scope(?:\.ts)?'/)
  assert.match(page, /canManageContactForScope/)
  assert.match(page, /getEffectiveContactCategory/)
})

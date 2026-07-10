/**
 * ???? contacts page boundary ??? helper owner ?????? entities/contact ??? widget path ????.
 */
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const route = readFileSync('app/admin/(dashboard)/contacts/page.tsx', 'utf8')
const page = readFileSync('widgets/admin-contacts/ui/contacts-page.tsx', 'utf8')
const contactEntity = readFileSync('entities/contact/index.ts', 'utf8')

test('contacts route is a thin widget shell', () => {
  assert.match(route, /@\/widgets\/admin-contacts/)
  assert.match(route, /<ContactsPage \/>/)
  assert.doesNotMatch(route, /fetch\(/)
  assert.doesNotMatch(route, /useState/)
  assert.doesNotMatch(route, /saveContact/)
})

test('contacts page imports phone helpers used by saveContact', () => {
  assert.match(page, /isValidContactPhone/)
  assert.match(page, /normalizeContactPhone/)
  assert.match(
    page,
    /import \{[\s\S]*isValidContactPhone[\s\S]*normalizeContactPhone[\s\S]*\} from '@\/entities\/contact'/
  )
})

test('contact entity owns the FSD-lite helper exports after bridge cleanup', () => {
  assert.match(contactEntity, /export \* from '\.\/model\/coverage(?:\.ts)?'/)
  assert.match(contactEntity, /export \* from '\.\/lib\/scope(?:\.ts)?'/)
  assert.match(page, /canManageContactForScope/)
  assert.match(page, /getEffectiveContactCategory/)
})

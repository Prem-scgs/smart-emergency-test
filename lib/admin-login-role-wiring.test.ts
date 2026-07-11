/**
 * ???????? login ?????????? role ????????????????? ???????? operator ??????.
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('admin login delegates role and agency identity to the authenticated backend profile', async () => {
  const route = await readFile(new URL('../app/admin/page.tsx', import.meta.url), 'utf8')
  const source = await readFile(new URL('../widgets/admin-login/ui/admin-login-page.tsx', import.meta.url), 'utf8')

  assert.match(route, /@\/widgets\/admin-login/)
  assert.doesNotMatch(route, /useAuth/)
  assert.doesNotMatch(route, /ROLE_OPTIONS/)

  assert.match(source, /login\(email, password\)/)
  assert.doesNotMatch(source, /ROLE_OPTIONS/)
  assert.doesNotMatch(source, /selectedRole|selectedAgency|needsAgency/)
  assert.doesNotMatch(source, /value: 'super_admin'|value: 'agency_admin'|value: 'viewer'/)
})

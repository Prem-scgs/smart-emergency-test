import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('admin login exposes super admin, agency admin, and viewer only', async () => {
  const route = await readFile(new URL('../app/admin/page.tsx', import.meta.url), 'utf8')
  const source = await readFile(new URL('../widgets/admin-login/ui/admin-login-page.tsx', import.meta.url), 'utf8')

  assert.match(route, /@\/widgets\/admin-login/)
  assert.doesNotMatch(route, /useAuth/)
  assert.doesNotMatch(route, /ROLE_OPTIONS/)

  assert.match(source, /value: 'super_admin'/)
  assert.match(source, /value: 'agency_admin'/)
  assert.match(source, /value: 'viewer'/)
  assert.doesNotMatch(source, /value: 'operator'/)
  assert.match(source, /const needsAgency = selectedRole && selectedRole !== 'super_admin'/)
})

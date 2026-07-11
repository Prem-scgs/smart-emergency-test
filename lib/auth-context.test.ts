/** Wiring contract ของ real admin auth provider หลังถอด mock localStorage/role selector. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)

test('auth provider restores profile from backend using the session access token', async () => {
  const source = await readFile(new URL('shared/auth/auth-context.tsx', root), 'utf8')

  assert.match(source, /getStoredAdminAccessToken/)
  assert.match(source, /\/api\/auth\/me/)
  assert.match(source, /Authorization: `Bearer \$\{accessToken\}`/)
  assert.doesNotMatch(source, /localStorage|loadStoredAuthState|ADMIN_USER_STORAGE_KEY/)
})

test('auth provider logs in with credentials only and stores the signed token', async () => {
  const source = await readFile(new URL('shared/auth/auth-context.tsx', root), 'utf8')

  assert.match(source, /login: \(email: string, password: string\)/)
  assert.match(source, /\/api\/auth\/login/)
  assert.match(source, /saveAdminAccessToken/)
  assert.match(source, /clearAdminAccessToken/)
  assert.doesNotMatch(source, /role: AdminRole, agencyId/)
})

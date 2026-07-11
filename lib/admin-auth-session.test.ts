/** Contract ของ access token ฝั่ง admin: อยู่เฉพาะ sessionStorage และไม่ปนกับ profile/mobile preferences. */
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ADMIN_ACCESS_TOKEN_STORAGE_KEY,
  clearAdminAccessToken,
  getStoredAdminAccessToken,
  saveAdminAccessToken,
} from '../shared/auth/session.ts'

function createStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    values,
  }
}

test('admin access token uses the dedicated session storage key', () => {
  const storage = createStorage()

  saveAdminAccessToken('signed.jwt', storage)

  assert.equal(ADMIN_ACCESS_TOKEN_STORAGE_KEY, 'smart-emergency:admin-access-token')
  assert.equal(storage.values.get(ADMIN_ACCESS_TOKEN_STORAGE_KEY), 'signed.jwt')
  assert.equal(getStoredAdminAccessToken(storage), 'signed.jwt')
})

test('clearing admin session removes the access token', () => {
  const storage = createStorage()
  saveAdminAccessToken('signed.jwt', storage)

  clearAdminAccessToken(storage)

  assert.equal(getStoredAdminAccessToken(storage), null)
})

/** Wiring contract ของหน้า real admin user management. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const read = path => readFile(new URL(path, root), 'utf8')

test('admin users route remains a thin widget shell', async () => {
  const route = await read('app/admin/(dashboard)/users/page.tsx')

  assert.match(route, /@\/widgets\/admin-users/)
  assert.doesNotMatch(route, /fetch\(|\/api\/admin\/users/)
})

test('admin users widget uses authenticated CRUD endpoints and protects the current account', async () => {
  const page = await read('widgets/admin-users/ui/users-page.tsx')

  assert.match(page, /useAuth\(\)/)
  assert.match(page, /buildAdminApiHeaders\(user\)/)
  assert.match(page, /\/api\/admin\/users/)
  assert.match(page, /method: isCreate \? 'POST' : 'PATCH'/)
  assert.match(page, /method: 'PATCH'/)
  assert.match(page, /method: 'DELETE'/)
  assert.match(page, /selectedUser\.id === user\?\.id/)
  assert.doesNotMatch(page, /ยังไม่ทำ CRUD ผู้ใช้|รอเชื่อมระบบ Auth จริง/)
})

test('admin users widget exposes create edit password reset and deactivate dialogs', async () => {
  const page = await read('widgets/admin-users/ui/users-page.tsx')
  const types = await read('widgets/admin-users/model/types.ts')

  assert.match(types, /'create'.*'edit'.*'password'.*'deactivate'/s)
  assert.match(page, /role.*agency_admin.*viewer/s)
  assert.match(page, /activeFilter/)
  assert.match(page, /setSearch/)
})

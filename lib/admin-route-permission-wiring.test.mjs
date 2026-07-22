/**
 * ล็อก wiring ระหว่าง permission map, sidebar และ admin shell
 * เพื่อไม่ให้เมนูซ่อนแล้วแต่ยังเปิด widget ผ่าน URL ตรงได้อีก
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const shell = readFileSync('widgets/admin-shell/ui/admin-layout-client.tsx', 'utf8')
const navigation = readFileSync('widgets/admin-shell/model/navigation.ts', 'utf8')
const routes = readFileSync('widgets/admin-shell/model/route-permissions.ts', 'utf8')
const denied = readFileSync('widgets/admin-shell/ui/admin-access-denied.tsx', 'utf8')
const permissions = readFileSync('shared/auth/types.ts', 'utf8')

test('sidebar and route guard share one route permission source', () => {
  assert.match(navigation, /adminRouteDefinitions/)
  assert.match(shell, /findAdminRouteDefinition\(pathname\)/)
  assert.match(routes, /showInSidebar/)
  assert.match(routes, /longest|ยาวที่สุด/i)
})

test('admin shell blocks unauthorized children behind an in-shell 403', () => {
  assert.match(shell, /AdminAccessDenied/)
  assert.match(shell, /hasPermission\(currentRoute\.permission\)/)
  assert.match(shell, /if \(!canAccessCurrentRoute\)/)
  assert.match(denied, /403/)
  assert.match(denied, /\/admin\/dashboard/)
  assert.match(shell, /UI access boundary|ขอบเขตการเข้าถึงฝั่ง UI/)
  assert.match(shell, /backend|Backend/)
  assert.match(shell, /<main className="flex-1 overflow-auto">\{guardedContent\}<\/main>/)
})

test('new permission comments are valid UTF-8 without replacement characters', () => {
  assert.doesNotMatch(routes + denied + shell, /\uFFFD/)
})

test('settings and users permissions preserve the agreed role boundaries', () => {
  const superAdmin = permissions.match(/super_admin:\s*\[([\s\S]*?)\n\s*\],/)?.[1] ?? ''
  const agencyAdmin = permissions.match(/agency_admin:\s*\[([\s\S]*?)\n\s*\],/)?.[1] ?? ''
  const viewer = permissions.match(/viewer:\s*\[([\s\S]*?)\n\s*\],/)?.[1] ?? ''

  for (const role of [superAdmin, agencyAdmin, viewer]) {
    assert.match(role, /settings\.view/)
    assert.match(role, /settings\.personal\.edit/)
  }

  assert.match(superAdmin, /users\.view/)
  assert.match(superAdmin, /settings\.organization\.edit/)
  assert.match(superAdmin, /settings\.share-channels\.edit/)
  assert.match(superAdmin, /settings\.health\.view/)
  assert.doesNotMatch(agencyAdmin + viewer, /users\.view/)
  assert.doesNotMatch(agencyAdmin + viewer, /settings\.(organization|share-channels|health)/)
})

/**
 * ล็อก contract การเลือก permission ของ admin route
 *
 * ชุดนี้กัน nested route หลุด guard และกัน unknown route ถูกตีความเป็น 403
 * แทนที่จะปล่อยให้ Next.js แสดง 404 ตามปกติ
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { ROLE_PERMISSIONS, type AdminRole } from '../shared/auth/types.ts'
import {
  adminRouteDefinitions,
  findAdminRouteDefinition,
} from '../widgets/admin-shell/model/route-permissions.ts'

test('maps every guarded admin route to its owner permission', () => {
  assert.deepEqual(
    adminRouteDefinitions.map(({ href, permission }) => [href, permission]),
    [
      ['/admin/dashboard', 'dashboard.view'],
      ['/admin/contacts', 'contacts.view'],
      ['/admin/call-logs', 'call-logs.view'],
      ['/admin/gis', 'gis.view'],
      ['/admin/reports', 'reports.view'],
      ['/admin/settings', 'settings.view'],
      ['/admin/users', 'users.view'],
    ]
  )
})

test('matches exact and nested routes using the most specific prefix', () => {
  assert.equal(findAdminRouteDefinition('/admin/users')?.permission, 'users.view')
  assert.equal(findAdminRouteDefinition('/admin/users/user-123')?.permission, 'users.view')
  assert.equal(findAdminRouteDefinition('/admin/settings/profile')?.permission, 'settings.view')
})

test('does not claim unknown admin routes so Next.js can render 404', () => {
  assert.equal(findAdminRouteDefinition('/admin/not-a-real-page'), null)
  assert.equal(findAdminRouteDefinition('/admin'), null)
})

function canRoleOpen(role: AdminRole, pathname: string) {
  const route = findAdminRouteDefinition(pathname)
  return route ? ROLE_PERMISSIONS[role].includes(route.permission) : true
}

test('enforces route access for super admin, agency admin, and viewer', () => {
  for (const route of adminRouteDefinitions) {
    assert.equal(canRoleOpen('super_admin', route.href), true)
  }

  assert.equal(canRoleOpen('agency_admin', '/admin/contacts'), true)
  assert.equal(canRoleOpen('agency_admin', '/admin/users'), false)

  for (const pathname of [
    '/admin/dashboard',
    '/admin/call-logs',
    '/admin/gis',
    '/admin/reports',
    '/admin/settings',
  ]) {
    assert.equal(canRoleOpen('viewer', pathname), true)
  }
  assert.equal(canRoleOpen('viewer', '/admin/contacts'), false)
  assert.equal(canRoleOpen('viewer', '/admin/users/user-123'), false)
})

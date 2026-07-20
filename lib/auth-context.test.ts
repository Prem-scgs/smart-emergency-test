/**
 * ???? auth restore/session behavior ????????? reject legacy operator session.
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import { restoreStoredAdminUser } from '../shared/auth/session.ts'

test('restoreStoredAdminUser returns null for missing storage', () => {
  assert.equal(restoreStoredAdminUser(null), null)
})

test('restoreStoredAdminUser restores admin user and converts lastLogin to Date', () => {
  const user = restoreStoredAdminUser(
    JSON.stringify({
      id: 'user-1',
      email: 'prem@example.com',
      name: 'ผู้ดูแลแพทย์',
      role: 'agency_admin',
      agencyId: 'medical',
      agency: {
        id: 'medical',
        name: 'Medical',
        nameTh: 'การแพทย์ฉุกเฉิน',
        category: 'medical',
        description: 'Emergency Medical Services',
        icon: 'Heart',
        color: 'text-red-600',
      },
      permissions: ['dashboard.view'],
      lastLogin: '2026-06-15T15:00:00.000Z',
    })
  )

  assert.ok(user)
  assert.equal(user?.agencyId, 'medical')
  assert.ok(user?.lastLogin instanceof Date)
  assert.equal(user?.lastLogin.toISOString(), '2026-06-15T15:00:00.000Z')
})

test('restoreStoredAdminUser rehydrates agency from agencyId for legacy viewer sessions', () => {
  const user = restoreStoredAdminUser(
    JSON.stringify({
      id: 'viewer-legacy',
      email: 'viewer@example.com',
      name: 'Viewer',
      role: 'viewer',
      agencyId: 'police',
      permissions: ['dashboard.view'],
      lastLogin: '2026-07-06T10:00:00.000Z',
    })
  )

  assert.ok(user)
  assert.equal(user?.role, 'viewer')
  assert.equal(user?.agencyId, 'police')
  assert.equal(user?.agency?.category, 'police')
})

test('restoreStoredAdminUser rehydrates agency from prefixed legacy agencyId', () => {
  const user = restoreStoredAdminUser(
    JSON.stringify({
      id: 'viewer-legacy-prefixed',
      email: 'viewer@example.com',
      name: 'Viewer',
      role: 'viewer',
      agencyId: 'agency-medical',
      permissions: ['dashboard.view'],
      lastLogin: '2026-07-06T10:00:00.000Z',
    })
  )

  assert.ok(user)
  assert.equal(user?.agencyId, 'agency-medical')
  assert.equal(user?.agency?.category, 'medical')
})

test('restoreStoredAdminUser rejects unsupported legacy operator sessions', () => {
  const user = restoreStoredAdminUser(
    JSON.stringify({
      id: 'operator-legacy',
      email: 'operator@example.com',
      name: 'Operator',
      role: 'operator',
      permissions: ['dashboard.view'],
      lastLogin: '2026-07-06T10:00:00.000Z',
    })
  )

  assert.equal(user, null)
})

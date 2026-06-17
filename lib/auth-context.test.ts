import test from 'node:test'
import assert from 'node:assert/strict'

import { restoreStoredAdminUser } from './auth-context'

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

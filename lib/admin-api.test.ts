import test from 'node:test'
import assert from 'node:assert/strict'

import { buildAdminApiHeaders, buildAdminEventsUrl, getBackendAdminScope } from './admin-api'

test('getBackendAdminScope maps super admin role to backend format', () => {
  const scope = getBackendAdminScope({
    id: 'user-1',
    email: 'prem@example.com',
    name: 'Prem',
    role: 'super_admin',
    permissions: [],
    lastLogin: new Date(),
  })

  assert.deepEqual(scope, { role: 'super_admin', category: null })
})

test('getBackendAdminScope maps agency admin role to backend format with category', () => {
  const scope = getBackendAdminScope({
    id: 'user-2',
    email: 'prem@example.com',
    name: 'Prem',
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
    permissions: [],
    lastLogin: new Date(),
  })

  assert.deepEqual(scope, { role: 'agency_admin', category: 'medical' })
})

test('buildAdminApiHeaders returns backend scope headers', () => {
  const headers = buildAdminApiHeaders({
    id: 'user-2',
    email: 'prem@example.com',
    name: 'Prem',
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
    permissions: [],
    lastLogin: new Date(),
  })

  assert.deepEqual(headers, {
    'x-admin-role': 'agency_admin',
    'x-admin-category': 'medical',
  })
})

test('buildAdminEventsUrl appends scope as query params for event source', () => {
  const url = buildAdminEventsUrl('http://localhost:4000', {
    id: 'user-2',
    email: 'prem@example.com',
    name: 'Prem',
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
    permissions: [],
    lastLogin: new Date(),
  })

  assert.equal(url, 'http://localhost:4000/api/events?role=agency_admin&category=medical')
})

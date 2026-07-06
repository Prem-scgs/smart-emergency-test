import test from 'node:test'
import assert from 'node:assert/strict'

import { buildAdminApiHeaders, buildAdminEventsUrl, getBackendAdminScope } from '../shared/api/admin-api.ts'

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

test('getBackendAdminScope maps viewer role to category-scoped backend format', () => {
  const scope = getBackendAdminScope({
    id: 'user-viewer',
    email: 'viewer@example.com',
    name: 'Viewer',
    role: 'viewer',
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

  assert.deepEqual(scope, { role: 'viewer', category: 'medical' })
})

test('getBackendAdminScope falls back to agencyId for legacy viewer sessions', () => {
  const scope = getBackendAdminScope({
    id: 'user-viewer-legacy',
    email: 'viewer@example.com',
    name: 'Viewer',
    role: 'viewer',
    agencyId: 'police',
    permissions: [],
    lastLogin: new Date(),
  })

  assert.deepEqual(scope, { role: 'viewer', category: 'police' })
})

test('getBackendAdminScope normalizes legacy agency-prefixed ids', () => {
  const scope = getBackendAdminScope({
    id: 'user-viewer-legacy-prefixed',
    email: 'viewer@example.com',
    name: 'Viewer',
    role: 'viewer',
    agencyId: 'agency-medical',
    permissions: [],
    lastLogin: new Date(),
  })

  assert.deepEqual(scope, { role: 'viewer', category: 'medical' })
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

test('buildAdminEventsUrl supports relative API base paths', () => {
  const url = buildAdminEventsUrl('/emergency-api', {
    id: 'user-1',
    email: 'prem@example.com',
    name: 'Prem',
    role: 'super_admin',
    permissions: [],
    lastLogin: new Date(),
  })

  assert.equal(url, '/emergency-api/api/events?role=super_admin')
})

test('buildAdminEventsUrl scopes viewer event streams by category', () => {
  const url = buildAdminEventsUrl('http://localhost:4000', {
    id: 'user-viewer',
    email: 'viewer@example.com',
    name: 'Viewer',
    role: 'viewer',
    agencyId: 'fire',
    agency: {
      id: 'fire',
      name: 'Fire Department',
      nameTh: 'ดับเพลิง',
      category: 'fire',
      description: 'Fire',
      icon: 'Flame',
      color: 'text-orange-600',
    },
    permissions: [],
    lastLogin: new Date(),
  })

  assert.equal(url, 'http://localhost:4000/api/events?role=viewer&category=fire')
})

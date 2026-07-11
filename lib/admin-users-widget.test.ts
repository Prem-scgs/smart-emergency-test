import assert from 'node:assert/strict'
import test from 'node:test'

import {
  emptyAdminUserForm,
  getAdminUserFormError,
  toAdminUserForm,
} from '../widgets/admin-users/lib/form.ts'

test('new admin users default to viewer and active', () => {
  assert.deepEqual(emptyAdminUserForm, {
    email: '',
    displayName: '',
    password: '',
    role: 'viewer',
    agencyId: '',
    active: true,
  })
})

test('scoped roles require an agency while super admin must not have one', () => {
  assert.equal(
    getAdminUserFormError({ ...emptyAdminUserForm, email: 'a@b.com', displayName: 'A', password: '12345678' }),
    'agency-required',
  )
  assert.equal(
    getAdminUserFormError({ ...emptyAdminUserForm, email: 'a@b.com', displayName: 'A', password: '12345678', role: 'super_admin', agencyId: 'agency-1' }),
    'super-admin-agency-forbidden',
  )
})

test('editing a user never pre-fills the password', () => {
  const form = toAdminUserForm({
    id: 'u1',
    email: 'viewer@example.com',
    displayName: 'Viewer',
    role: 'viewer',
    agencyId: 'agency-1',
    active: true,
  })

  assert.equal(form.password, '')
  assert.equal(form.agencyId, 'agency-1')
})

import assert from 'node:assert/strict'
import { test } from 'node:test'

import { emptyForm, toForm } from '../widgets/admin-contacts/lib/form.ts'
import type { Contact } from '../widgets/admin-contacts/model/types.ts'

const baseContact: Contact = {
  id: 'contact-1',
  name: 'Central Rescue',
  phone: '1669',
  role: 'responder',
  category: 'medical',
  provinceCode: null,
  province: null,
  districtCode: null,
  district: null,
  is24Hours: true,
  active: true,
  createdAt: '2026-07-09T00:00:00.000Z',
  updatedAt: '2026-07-09T00:00:00.000Z',
}

test('emptyForm keeps the existing create-contact defaults', () => {
  assert.deepEqual(emptyForm, {
    name: '',
    phone: '',
    category: 'fire',
    is24Hours: true,
    active: true,
  })
})

test('toForm maps editable contact fields and preserves contact category', () => {
  assert.deepEqual(toForm(baseContact), {
    name: 'Central Rescue',
    phone: '1669',
    category: 'medical',
    is24Hours: true,
    active: true,
  })
})

test('toForm falls back to fire category when legacy contact category is missing', () => {
  assert.equal(toForm({ ...baseContact, category: null }).category, 'fire')
})

import test from 'node:test'
import assert from 'node:assert/strict'

import {
  canManageContactForScope,
  getContactCoverageFromValues,
  getContactCoverageKind,
  getContactCoverageState,
  getContactDisplayCategoryLabel,
  getEffectiveContactCategory,
  getInitialContactCategory,
  getSelectOptionLabel,
  isValidContactPhone,
  normalizeContactPhone,
  getContactRole,
} from '../entities/contact/index.ts'

test('central coverage clears province and district', () => {
  assert.deepEqual(getContactCoverageState('central', '65', '6501'), {
    coverage: 'central',
    provinceCode: '',
    districtCode: '',
  })
})

test('province coverage keeps the selected province and clears district', () => {
  assert.deepEqual(getContactCoverageState('province', '65', '6501'), {
    coverage: 'province',
    provinceCode: '65',
    districtCode: '',
  })
})

test('district coverage requires a province before its district can be selected', () => {
  assert.deepEqual(getContactCoverageState('district', '', '6501'), {
    coverage: 'district',
    provinceCode: '',
    districtCode: '',
  })
})

test('coverage kind follows stored province and district values', () => {
  assert.equal(getContactCoverageFromValues(null, null, null, null), 'central')
  assert.equal(getContactCoverageFromValues('65', null, null, null), 'province')
  assert.equal(getContactCoverageKind({ provinceCode: '65', districtCode: '6501' }), 'district')
})

test('select and category labels show human-readable text instead of stored codes', () => {
  const options = [
    { value: 'central', label: 'ส่วนกลาง' },
    { value: 'province', label: 'ระดับจังหวัด' },
  ]

  assert.equal(getSelectOptionLabel(options, 'province', 'เลือกขอบเขตบริการ'), 'ระดับจังหวัด')
  assert.equal(getContactDisplayCategoryLabel(null, options, 'ไม่ระบุหน่วยงาน'), 'ไม่ระบุหน่วยงาน')
  assert.equal(getContactDisplayCategoryLabel('medical', options, 'ไม่ระบุหน่วยงาน'), 'medical')
})

test('contact save uses responder when the form has no role input', () => {
  assert.equal(getContactRole(''), 'responder')
})

test('contact phone accepts emergency short codes and Thai phone numbers', () => {
  assert.equal(isValidContactPhone('199'), true)
  assert.equal(isValidContactPhone('1669'), true)
  assert.equal(isValidContactPhone('081-234-5678'), true)
  assert.equal(normalizeContactPhone('081-234-5678'), '0812345678')
  assert.equal(isValidContactPhone('12'), false)
  assert.equal(isValidContactPhone('12345'), false)
})

test('contact scope helpers preserve super admin and agency admin rules', () => {
  assert.equal(
    canManageContactForScope({ isSuperAdmin: true, role: 'viewer', agencyCategory: null }, { category: 'fire' }),
    true
  )
  assert.equal(
    canManageContactForScope({ isSuperAdmin: false, role: 'agency_admin', agencyCategory: 'medical' }, { category: 'medical' }),
    true
  )
  assert.equal(
    canManageContactForScope({ isSuperAdmin: false, role: 'viewer', agencyCategory: 'medical' }, { category: 'medical' }),
    false
  )
})

test('contact category helpers preserve create and save category behavior', () => {
  assert.equal(getInitialContactCategory(true, 'medical', 'fire'), 'fire')
  assert.equal(getInitialContactCategory(false, 'medical', 'fire'), 'medical')
  assert.equal(getEffectiveContactCategory(true, 'fire', 'medical'), 'fire')
  assert.equal(getEffectiveContactCategory(false, 'fire', 'medical'), 'medical')
  assert.equal(getEffectiveContactCategory(false, 'fire', null), null)
})

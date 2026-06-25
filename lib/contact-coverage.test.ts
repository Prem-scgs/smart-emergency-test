import test from 'node:test'
import assert from 'node:assert/strict'

import { getContactCoverageState } from './contact-coverage.ts'

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


test('select labels show human-readable text instead of stored codes', async () => {
  const { getSelectOptionLabel } = await import('./contact-coverage.ts')
  assert.equal(
    getSelectOptionLabel(
      [
        { value: 'central', label: 'ส่วนกลาง' },
        { value: 'province', label: 'ระดับจังหวัด' },
      ],
      'province',
      'เลือกขอบเขตบริการ'
    ),
    'ระดับจังหวัด'
  )
})


test('contact save uses responder when the form has no role input', async () => {
  const { getContactRole } = await import('./contact-coverage.ts')
  assert.equal(getContactRole(''), 'responder')
})


test('contact phone accepts emergency short codes and Thai phone numbers', async () => {
  const { normalizeContactPhone, isValidContactPhone } = await import('./contact-coverage.ts')
  assert.equal(isValidContactPhone('199'), true)
  assert.equal(isValidContactPhone('1669'), true)
  assert.equal(isValidContactPhone('081-234-5678'), true)
  assert.equal(normalizeContactPhone('081-234-5678'), '0812345678')
  assert.equal(isValidContactPhone('12'), false)
  assert.equal(isValidContactPhone('12345'), false)
})

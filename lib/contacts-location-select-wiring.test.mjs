import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const page = readFileSync('app/admin/(dashboard)/contacts/page.tsx', 'utf8')

test('contacts location selects render Thai labels instead of raw province or district codes', () => {
  assert.match(page, /selectedProvinceLabel/)
  assert.match(page, /selectedDistrictLabel/)
  assert.match(page, /getLocationDisplayName\(province\)/)
  assert.match(page, /getLocationDisplayName\(district\)/)
  assert.match(page, /<span className="truncate">\{selectedProvinceLabel\}<\/span>/)
  assert.match(page, /<span className="truncate">\{selectedDistrictLabel\}<\/span>/)

  assert.doesNotMatch(page, /const province = provinces\.find\(\s*item => \(item\.provinceCode \?\? item\.id\) === value/)
  assert.doesNotMatch(page, /const district = availableDistricts\.find\(\s*item => \(item\.districtCode \?\? item\.id\) === value/)
  assert.doesNotMatch(page, /<SelectValue>\{selectedProvinceLabel\}<\/SelectValue>/)
  assert.doesNotMatch(page, /<SelectValue>\{selectedDistrictLabel\}<\/SelectValue>/)
})

import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const contactsPage = readFileSync('app/admin/(dashboard)/contacts/page.tsx', 'utf8')
const i18n = [
  readFileSync('shared/i18n/admin/admin-i18n-context.tsx', 'utf8'),
  readFileSync('shared/i18n/admin/dictionaries/th.ts', 'utf8'),
  readFileSync('shared/i18n/admin/dictionaries/en.ts', 'utf8'),
].join('\n')

test('contacts page uses admin i18n and localized master data labels', () => {
  assert.match(contactsPage, /useAdminI18n/)
  assert.match(contactsPage, /buildAdminCategoryCollections\(referenceCategories, preferThai\)/)
  assert.match(contactsPage, /useLocationLookupMaps/)
  assert.match(contactsPage, /getLocationDisplayName\(provinceByCode\[/)
  assert.match(contactsPage, /getLocationDisplayName\(districtByCode\[/)
  assert.match(contactsPage, /getLocationDisplayName\(province, preferThai\)/)
  assert.match(contactsPage, /getLocationDisplayName\(district, preferThai\)/)
  assert.match(contactsPage, /t\(["']contactsPageTitle["']\)/)
  assert.match(contactsPage, /t\(["']contactsDeleteConfirm["']\)/)

  assert.doesNotMatch(contactsPage, />จัดการเบอร์ฉุกเฉิน</)
  assert.doesNotMatch(contactsPage, /placeholder="ค้นหาชื่อ เบอร์ หน่วยงาน จังหวัด หรืออำเภอ"/)
  assert.doesNotMatch(contactsPage, /CONTACT_COVERAGE_OPTIONS/)
})

test('admin i18n dictionary contains contacts translations in Thai and English', () => {
  assert.match(i18n, /contactsPageTitle: "จัดการเบอร์ฉุกเฉิน"/)
  assert.match(i18n, /contactsPageTitle: "Emergency contacts"/)
  assert.match(i18n, /contactsCoverageCentral: "ส่วนกลาง"/)
  assert.match(i18n, /contactsCoverageCentral: "Central"/)
  assert.match(i18n, /contactsDeleteConfirm: "ลบเบอร์"/)
  assert.match(i18n, /contactsDeleteConfirm: "Delete contact"/)
})

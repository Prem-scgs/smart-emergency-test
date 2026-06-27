import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const i18nPath = 'lib/admin-i18n.tsx'
const rootLayout = readFileSync('app/admin/layout.tsx', 'utf8')
const adminShell = readFileSync('components/admin/admin-layout-client.tsx', 'utf8')
const settingsPage = readFileSync('app/admin/(dashboard)/settings/page.tsx', 'utf8')

test('admin has a central i18n provider wired into the admin tree', () => {
  assert.equal(existsSync(i18nPath), true)
  const i18n = readFileSync(i18nPath, 'utf8')

  assert.match(i18n, /AdminI18nProvider/)
  assert.match(i18n, /useAdminI18n/)
  assert.match(i18n, /admin_settings_preferences/)
  assert.match(i18n, /smart-emergency:admin-language-change/)
  assert.match(i18n, /dashboard: "Dashboard"/)
  assert.match(i18n, /settingsTitle: "Settings"/)

  assert.match(rootLayout, /AdminI18nProvider/)
  assert.match(rootLayout, /<AdminI18nProvider>/)
})

test('admin shell uses translations instead of fixed menu labels', () => {
  assert.match(adminShell, /useAdminI18n/)
  assert.match(adminShell, /labelKey: 'dashboard'/)
  assert.match(adminShell, /t\(item\.labelKey\)/)
  assert.match(adminShell, /t\('commandCenter'\)/)
  assert.doesNotMatch(adminShell, /label: 'แดชบอร์ด'/)
})

test('settings page uses admin i18n for visible settings copy', () => {
  assert.match(settingsPage, /useAdminI18n/)
  assert.match(settingsPage, /t\(["']settingsTitle["']\)/)
  assert.match(settingsPage, /t\(["']saveSettings["']\)/)
  assert.match(settingsPage, /t\(["']languageAssistiveLabel["']\)/)
  assert.match(settingsPage, /ADMIN_LANGUAGE_CHANGE_EVENT/)
})

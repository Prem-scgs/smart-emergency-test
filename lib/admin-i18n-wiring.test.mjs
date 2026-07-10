/**
 * ???? wiring ??? admin i18n provider/dictionaries ???????? key ???????-?????????????? refactor.
 */
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const i18nContextPath = 'shared/i18n/admin/admin-i18n-context.tsx'
const i18nConstantsPath = 'shared/i18n/admin/constants.ts'
const thDictionaryPath = 'shared/i18n/admin/dictionaries/th.ts'
const enDictionaryPath = 'shared/i18n/admin/dictionaries/en.ts'
const rootLayout = readFileSync('app/admin/layout.tsx', 'utf8')
const dashboardLayout = readFileSync('app/admin/(dashboard)/layout.tsx', 'utf8')
const adminShell = readFileSync('widgets/admin-shell/ui/admin-layout-client.tsx', 'utf8')
const adminShellIndex = readFileSync('widgets/admin-shell/index.ts', 'utf8')
const adminShellNavigation = readFileSync('widgets/admin-shell/model/navigation.ts', 'utf8')
const adminShellOrganizationSettings = readFileSync('widgets/admin-shell/model/organization-settings.ts', 'utf8')
const adminShellRoleBadge = readFileSync('widgets/admin-shell/model/role-badge.ts', 'utf8')
const settingsRoute = readFileSync('app/admin/(dashboard)/settings/page.tsx', 'utf8')
const settingsPage = readFileSync('widgets/admin-settings/ui/settings-page.tsx', 'utf8')
const settingsPreferences = readFileSync('widgets/admin-settings/lib/preferences.ts', 'utf8')

test('admin has a central i18n provider wired into the admin tree', () => {
  assert.equal(existsSync(i18nContextPath), true)
  assert.equal(existsSync(thDictionaryPath), true)
  assert.equal(existsSync(enDictionaryPath), true)
  const i18n = [
    readFileSync(i18nContextPath, 'utf8'),
    readFileSync(i18nConstantsPath, 'utf8'),
    readFileSync(thDictionaryPath, 'utf8'),
    readFileSync(enDictionaryPath, 'utf8'),
  ].join('\n')

  assert.match(i18n, /AdminI18nProvider/)
  assert.match(i18n, /useAdminI18n/)
  assert.match(i18n, /admin_settings_preferences/)
  assert.match(i18n, /smart-emergency:admin-language-change/)
  assert.match(i18n, /dashboard: "Dashboard"/)
  assert.match(i18n, /settingsTitle: "Settings"/)
  assert.match(i18n, /export const th =/)
  assert.match(i18n, /export const en =/)

  assert.match(rootLayout, /AdminI18nProvider/)
  assert.match(rootLayout, /<AdminI18nProvider>/)
})

test('admin shell uses translations instead of fixed menu labels', () => {
  assert.match(dashboardLayout, /from ['"]@\/widgets\/admin-shell['"]/)
  assert.match(adminShellIndex, /export \* from '\.\/ui\/admin-layout-client\.tsx'/)
  assert.doesNotMatch(adminShellIndex, /organization-settings/)
  assert.match(adminShell, /useAdminI18n/)
  assert.match(adminShell, /adminShellSidebarItems/)
  assert.match(adminShell, /t\(item\.labelKey\)/)
  assert.match(adminShell, /organizationSettings/)
  assert.match(adminShell, /useOrganizationSettings\(user, isAuthenticated\)/)
  assert.match(adminShellNavigation, /labelKey: 'dashboard'/)
  assert.match(adminShellOrganizationSettings, /\/api\/admin\/organization-settings/)
  assert.match(adminShellOrganizationSettings, /smart-emergency:organization-settings-updated/)
  assert.match(adminShellRoleBadge, /roleSuperAdmin/)
  assert.doesNotMatch(adminShell, /label: 'แดชบอร์ด'/)
  assert.doesNotMatch(adminShell, />Smart Emergency<\/span>/)
})

test('settings page uses admin i18n for visible settings copy', () => {
  assert.match(settingsRoute, /@\/widgets\/admin-settings/)
  assert.match(settingsPage, /useAdminI18n/)
  assert.match(settingsPage, /t\(["']settingsTitle["']\)/)
  assert.match(settingsPage, /t\(["']saveSettings["']\)/)
  assert.match(settingsPage, /t\(["']languageAssistiveLabel["']\)/)
  assert.match(settingsPreferences, /ADMIN_LANGUAGE_CHANGE_EVENT/)
})

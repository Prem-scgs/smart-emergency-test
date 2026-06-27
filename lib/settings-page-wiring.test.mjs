import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const page = readFileSync('app/admin/(dashboard)/settings/page.tsx', 'utf8')
const globals = readFileSync('app/globals.css', 'utf8')
const alertDisplay = readFileSync('components/admin/alert-display.tsx', 'utf8')

test('settings page keeps existing shell but removes mock-only settings', () => {
  assert.match(page, /<Tabs defaultValue=/)
  assert.match(page, /t\("reset"\)/)
  assert.match(page, /t\("settingsDraftHint"\)/)
  assert.match(page, /<Save/)
  assert.match(page, /handleSave/)
  assert.match(page, /t\("settingsSaved"\)/)

  assert.doesNotMatch(page, /99\.9% uptime/)
  assert.doesNotMatch(page, /12ms latency/)
  assert.doesNotMatch(page, /1,234 active/)
  assert.doesNotMatch(page, /emailNotifications/)
  assert.doesNotMatch(page, /pushNotifications/)
  assert.doesNotMatch(page, /recordingEnabled/)
  assert.doesNotMatch(page, /twoFactorAuth/)
  assert.doesNotMatch(page, /ipWhitelist/)
})

test('settings page gates center channels and system health to super admin', () => {
  assert.match(page, /useAuth/)
  assert.match(page, /canViewAllAgencies/)
  assert.match(page, /isSuperAdmin/)
  assert.match(page, /shareChannelStatus/)
  assert.match(page, /systemHealth/)
  assert.match(page, /\/api\/reference\/share-channels/)
  assert.match(page, /\/health/)
})

test('settings page exposes real personal preferences', () => {
  assert.match(page, /getStoredAdminAlertPreferences/)
  assert.match(page, /saveAdminAlertPreferences/)
  assert.match(page, /testAlertTone/)
  assert.match(page, /reducedMotion/)
  assert.match(page, /ADMIN_SETTINGS_PREFERENCES_KEY/)
  assert.match(page, /setTheme/)
  assert.match(page, /useAdminI18n/)
  assert.match(page, /t\("darkModeDescription"\)/)
  assert.match(page, /t\("languageAssistiveLabel"\)/)
  assert.match(page, /ADMIN_LANGUAGE_CHANGE_EVENT/)
  assert.match(page, /t\("languageAssistiveDescription"\)/)
})

test('settings changes are draft until the admin clicks save', () => {
  assert.match(page, /settingsDraftHint/)
  assert.match(page, /function previewSettingsLanguage/)

  const alertChangeHandler = page.match(/const handleAlertPreferencesChange = \(next:[\s\S]*?\n  }/)?.[0] ?? ''
  assert.match(alertChangeHandler, /setAlertPreferences\(updated\)/)
  assert.doesNotMatch(alertChangeHandler, /saveAdminAlertPreferences\(updated\)/)

  const settingsChangeHandler = page.match(/const handleSettingsPreferencesChange = \(next:[\s\S]*?\n  }/)?.[0] ?? ''
  assert.match(settingsChangeHandler, /setSettingsPreferences\(updated\)/)
  assert.match(settingsChangeHandler, /previewSettingsLanguage\(updated\.language\)/)
  assert.doesNotMatch(settingsChangeHandler, /saveSettingsPreferences\(updated\)/)

  const saveHandler = page.match(/const handleSave = \(\) => {[\s\S]*?\n  }/)?.[0] ?? ''
  assert.match(saveHandler, /saveAdminAlertPreferences\(alertPreferences\)/)
  assert.match(saveHandler, /saveSettingsPreferences\(settingsPreferences\)/)
})

test('settings alert tones are admin preference presets with Thai labels', () => {
  assert.match(page, /const alertToneLabels = useMemo/)
  assert.match(page, /alertToneLabels\[alertPreferences\.tone\]/)
  assert.match(page, /<SelectValue>\{alertToneLabels\[alertPreferences\.tone\]\}<\/SelectValue>/)
  assert.match(page, /t\("alertToneDescription"\)/)
  assert.match(page, /<div className="flex flex-col gap-3">/)
  assert.match(page, /className="w-fit"/)
  assert.match(page, /<SelectItem value="soft-chime">\{t\("toneSoft"\)\}<\/SelectItem>/)
  assert.match(page, /<SelectItem value="alert-beep">\{t\("toneClear"\)\}<\/SelectItem>/)
  assert.match(page, /<SelectItem value="siren-pulse">\{t\("toneUrgent"\)\}<\/SelectItem>/)
  assert.doesNotMatch(page, />Soft chime</)
  assert.doesNotMatch(page, />Alert beep</)
  assert.doesNotMatch(page, />Siren pulse</)
})

test('admin alert sound depends on admin tone preference, not incident severity', () => {
  assert.match(alertDisplay, /function playAlertTone\(preset: AlertTonePreset\)/)
  assert.match(alertDisplay, /playAlertTone\(preferences\.tone\)/)
  assert.doesNotMatch(alertDisplay, /playAlertTone\(currentAlert\.severity/)
  assert.doesNotMatch(alertDisplay, /severity === 'critical'[\s\S]*frequency/)
})

test('settings reduced motion preference has global css behavior', () => {
  assert.match(page, /classList\.toggle\("reduce-motion", preferences\.reducedMotion\)/)
  assert.match(globals, /\.reduce-motion/)
  assert.match(globals, /animation-duration:\s*0\.01ms\s*!important/)
  assert.match(globals, /transition-duration:\s*0\.01ms\s*!important/)
  assert.match(globals, /scroll-behavior:\s*auto\s*!important/)
})

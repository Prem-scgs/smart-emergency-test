import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const page = readFileSync('app/admin/(dashboard)/settings/page.tsx', 'utf8')

test('settings page keeps existing shell but removes mock-only settings', () => {
  assert.match(page, /<Tabs defaultValue=/)
  assert.match(page, /รีเซ็ต/)
  assert.match(page, /บันทึก/)

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
  assert.match(page, /admin_settings_preferences/)
  assert.match(page, /setTheme/)
})

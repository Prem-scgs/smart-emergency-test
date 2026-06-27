import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const page = readFileSync('app/admin/(dashboard)/settings/page.tsx', 'utf8')
const globals = readFileSync('app/globals.css', 'utf8')
const alertDisplay = readFileSync('components/admin/alert-display.tsx', 'utf8')

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

test('settings alert tones are admin preference presets with Thai labels', () => {
  assert.match(page, /เลือกเสียงที่คุณได้ยินชัดที่สุดเมื่อมีเคสใหม่เข้าระบบ/)
  assert.match(page, /<div className="flex flex-col gap-3">/)
  assert.match(page, /className="w-fit"/)
  assert.match(page, /<SelectItem value="soft-chime">เบา<\/SelectItem>/)
  assert.match(page, /<SelectItem value="alert-beep">ชัด<\/SelectItem>/)
  assert.match(page, /<SelectItem value="siren-pulse">เร่งจังหวะ<\/SelectItem>/)
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

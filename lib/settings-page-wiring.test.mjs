import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const route = readFileSync('app/admin/(dashboard)/settings/page.tsx', 'utf8')
const page = readFileSync('widgets/admin-settings/ui/settings-page.tsx', 'utf8')
const preferences = readFileSync('widgets/admin-settings/lib/preferences.ts', 'utf8')
const shareChannels = readFileSync('widgets/admin-settings/lib/share-channels.tsx', 'utf8')
const health = readFileSync('widgets/admin-settings/lib/health.tsx', 'utf8')
const globals = readFileSync('app/globals.css', 'utf8')
const alertDisplay = readFileSync('features/incident-alert/ui/alert-display.tsx', 'utf8')
const incidentAlertFeature = readFileSync('features/incident-alert/lib/audio.ts', 'utf8')
const i18n = [
  readFileSync('shared/i18n/admin/admin-i18n-context.tsx', 'utf8'),
  readFileSync('shared/i18n/admin/dictionaries/th.ts', 'utf8'),
  readFileSync('shared/i18n/admin/dictionaries/en.ts', 'utf8'),
].join('\n')

test('settings route is a thin widget shell', () => {
  assert.match(route, /@\/widgets\/admin-settings/)
  assert.match(route, /<SettingsPage \/>/)
  assert.doesNotMatch(route, /fetch\(/)
  assert.doesNotMatch(route, /localStorage/)
  assert.doesNotMatch(route, /<Tabs/)
  assert.doesNotMatch(route, /handleSave/)
})

test('settings page keeps existing shell but removes mock-only settings', () => {
  assert.match(page, /<Tabs defaultValue=/)
  assert.match(page, /t\("reset"\)/)
  assert.match(page, /t\("settingsDraftHint"\)/)
  assert.match(page, /<Save/)
  assert.match(page, /handleSave/)
  assert.match(page, /t\("settingsSaved"\)/)
  assert.match(page, /t\("settingsOwnAgencyFallback"\)/)
  assert.match(page, /t\("settingsAudioUnsupported"\)/)
  assert.doesNotMatch(page, /หน่วยงานของฉัน/)
  assert.doesNotMatch(page, /เบราว์เซอร์นี้ยังไม่รองรับการทดสอบเสียง/)

  assert.doesNotMatch(page, /99\.9% uptime/)
  assert.doesNotMatch(page, /12ms latency/)
  assert.doesNotMatch(page, /1,234 active/)
  assert.doesNotMatch(page, /Mobile App/)
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
  assert.match(page, /organizationSettings/)
  assert.match(page, /buildAdminApiHeaders\(user\)/)
  assert.match(page, /systemHealth/)
  assert.match(page, /\/api\/admin\/organization-settings/)
  assert.match(page, /\/api\/admin\/share-channels/)
  assert.match(page, /maskedValue/)
  assert.match(page, /recipientValue/)
  assert.doesNotMatch(page, /\/api\/reference\/share-channels/)
  assert.match(page, /\/health/)
})

test('settings system status is read-only and uses real health signals', () => {
  assert.match(page, /fetch\(API_BASE_URL \+ "\/health"\)/)
  assert.match(page, /smart-emergency:sse-status/)
  assert.match(page, /systemStatusItems/)
  assert.match(page, /refreshSystemHealth/)
  assert.match(page, /healthLastCheckedAt/)
  assert.match(page, /sseLastCheckedAt/)
  assert.match(page, /t\("healthReadOnlyNote"\)/)
  assert.match(page, /t\("checkAgain"\)/)
  assert.match(page, /t\("lastChecked"\)/)
  assert.match(page, /t\("healthApiOnline"\)/)
  assert.match(page, /t\("healthDatabaseOnline"\)/)
  assert.match(page, /t\("healthSseConnected"\)/)
  assert.doesNotMatch(page, /Auto dispatch/)
  assert.doesNotMatch(page, /Escalation/)
  assert.doesNotMatch(page, /autoDispatchPending/)
  assert.doesNotMatch(page, /escalationPending/)
})

test('settings page lets super admin edit organization settings through the save flow', () => {
  assert.match(page, /DEFAULT_ORGANIZATION_SETTINGS/)
  assert.match(page, /handleOrganizationSettingsChange/)
  assert.match(page, /saveOrganizationSettings/)
  assert.match(page, /t\("organizationSettings"\)/)
  assert.match(page, /t\("systemNameLabel"\)/)
  assert.match(page, /t\("organizationNameLabel"\)/)
  assert.match(page, /t\("timezoneLabel"\)/)
  assert.match(page, /organizationSettingsSaveError/)
  assert.doesNotMatch(page, /value="organization"/)
  assert.doesNotMatch(page, /t\("organizationTab"\)/)
  assert.match(page, /<TabsList className=\{isSuperAdmin \? "grid w-full grid-cols-3"/)

  const personalTabStart = page.indexOf('<TabsContent value="personal"')
  const channelsTabStart = page.indexOf('<TabsContent value="channels"')
  const organizationCardIndex = page.indexOf('t("organizationSettings")', personalTabStart)
  const notificationCardIndex = page.indexOf('t("myNotifications")', personalTabStart)
  assert.ok(personalTabStart >= 0)
  assert.ok(channelsTabStart > personalTabStart)
  assert.ok(organizationCardIndex > personalTabStart && organizationCardIndex < channelsTabStart)
  assert.ok(notificationCardIndex > organizationCardIndex && notificationCardIndex < channelsTabStart)

  const saveHandler = page.match(/const handleSave = async \(\) => {[\s\S]*?\n  }/)?.[0] ?? ''
  assert.match(saveHandler, /await saveOrganizationSettings\(\)/)
  assert.match(saveHandler, /await saveShareChannels\(\)/)
})

test('settings center channel cards keep aligned form fields', () => {
  assert.match(page, /className="flex h-full flex-col rounded-lg border p-4"/)
  assert.match(page, /className="mt-1 min-h-10 text-sm text-muted-foreground"/)
})

test('settings page exposes real personal preferences', () => {
  assert.match(page, /getStoredAdminAlertPreferences/)
  assert.match(page, /saveAdminAlertPreferences/)
  assert.match(page, /testAlertTone/)
  assert.match(page, /reducedMotion/)
  assert.match(preferences, /ADMIN_SETTINGS_PREFERENCES_KEY/)
  assert.match(page, /setTheme/)
  assert.match(page, /useAdminI18n/)
  assert.match(page, /t\("darkModeDescription"\)/)
  assert.match(page, /t\("languageAssistiveLabel"\)/)
  assert.match(preferences, /ADMIN_LANGUAGE_CHANGE_EVENT/)
  assert.match(page, /t\("languageAssistiveDescription"\)/)
})

test('settings changes are draft until the admin clicks save', () => {
  assert.match(page, /settingsDraftHint/)
  assert.match(preferences, /function previewSettingsLanguage/)

  const alertChangeHandler = page.match(/const handleAlertPreferencesChange = \(next:[\s\S]*?\n  }/)?.[0] ?? ''
  assert.match(alertChangeHandler, /setAlertPreferences\(updated\)/)
  assert.doesNotMatch(alertChangeHandler, /saveAdminAlertPreferences\(updated\)/)

  const settingsChangeHandler = page.match(/const handleSettingsPreferencesChange = \(next:[\s\S]*?\n  }/)?.[0] ?? ''
  assert.match(settingsChangeHandler, /setSettingsPreferences\(updated\)/)
  assert.match(settingsChangeHandler, /previewSettingsLanguage\(updated\.language\)/)
  assert.doesNotMatch(settingsChangeHandler, /saveSettingsPreferences\(updated\)/)

  const saveHandler = page.match(/const handleSave = async \(\) => {[\s\S]*?\n  }/)?.[0] ?? ''
  assert.match(saveHandler, /saveAdminAlertPreferences\(alertPreferences\)/)
  assert.match(saveHandler, /saveSettingsPreferences\(settingsPreferences\)/)
  assert.match(saveHandler, /await saveShareChannels\(\)/)
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
  assert.match(incidentAlertFeature, /function playAlertTone\(preset: AlertTonePreset\)/)
  assert.match(alertDisplay, /playAlertTone\(preferences\.tone\)/)
  assert.doesNotMatch(alertDisplay, /playAlertTone\(currentAlert\.severity/)
  assert.doesNotMatch(incidentAlertFeature, /severity === 'critical'[\s\S]*frequency/)
})

test('settings reduced motion preference has global css behavior', () => {
  assert.match(preferences, /classList\.toggle\("reduce-motion", preferences\.reducedMotion\)/)
  assert.match(globals, /\.reduce-motion/)
  assert.match(globals, /animation-duration:\s*0\.01ms\s*!important/)
  assert.match(globals, /transition-duration:\s*0\.01ms\s*!important/)
  assert.match(globals, /scroll-behavior:\s*auto\s*!important/)
})

test('settings helper files own page-specific preference and badge helpers', () => {
  assert.match(preferences, /DEFAULT_SETTINGS_PREFERENCES/)
  assert.match(preferences, /function getStoredSettingsPreferences/)
  assert.match(preferences, /function saveSettingsPreferences/)
  assert.match(preferences, /function previewSettingsLanguage/)
  assert.match(shareChannels, /DEFAULT_SHARE_CHANNELS/)
  assert.match(shareChannels, /DEFAULT_SHARE_CHANNEL_DRAFTS/)
  assert.match(shareChannels, /function channelBadge/)
  assert.match(shareChannels, /function sourceLabel/)
  assert.match(health, /function statusBadge/)
})

test('admin i18n dictionary contains settings translations in Thai and English', () => {
  assert.match(i18n, /settingsOwnAgencyFallback: "หน่วยงานของฉัน"/)
  assert.match(i18n, /settingsOwnAgencyFallback: "my agency"/)
  assert.match(i18n, /settingsAudioUnsupported: "เบราว์เซอร์นี้ยังไม่รองรับการทดสอบเสียง"/)
  assert.match(i18n, /settingsAudioUnsupported: "This browser does not support sound testing yet"/)
  assert.match(i18n, /organizationSettings: "ข้อมูลศูนย์ \/ องค์กร"/)
  assert.match(i18n, /organizationSettings: "Center \/ organization info"/)
  assert.match(i18n, /languageAssistiveDescription: "ใช้กำหนดภาษาเอกสาร ตัวช่วยอ่านหน้าจอ และข้อความในหน้าแอดมินที่รองรับแล้ว"/)
  assert.match(i18n, /healthReadOnlyNote: "ส่วนนี้เป็นข้อมูลตรวจสอบระบบแบบอ่านอย่างเดียว ไม่ใช่การตั้งค่า"/)
  assert.match(i18n, /healthReadOnlyNote: "This area is read-only system monitoring, not a settings control"/)
})

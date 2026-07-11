import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = path => readFile(new URL(path, root), 'utf8')

test('mobile route owns a provider that is separate from admin i18n', async () => {
  const [page, provider, preferences] = await Promise.all([
    read('app/page.tsx'),
    read('shared/i18n/mobile/mobile-i18n-context.tsx'),
    read('shared/i18n/mobile/preferences.ts'),
  ])

  assert.match(page, /MobileI18nProvider/)
  assert.match(provider, /MOBILE_LANGUAGE_CHANGE_EVENT/)
  assert.match(preferences, /smart-emergency:mobile-language/)
  assert.doesNotMatch(preferences, /admin_settings_preferences/)
})

test('mobile screens use the mobile locale for reference data and timeline display', async () => {
  const [app, history, tracking, shareCard] = await Promise.all([
    read('widgets/mobile-emergency/ui/mobile-app.tsx'),
    read('widgets/mobile-emergency/ui/incident-history-screen.tsx'),
    read('widgets/mobile-emergency/ui/incident-tracking-screen.tsx'),
    read('features/location-sharing/ui/incident-location-share-card.tsx'),
  ])

  for (const source of [app, history, tracking, shareCard]) {
    assert.match(source, /useMobileI18n/)
  }
  assert.match(history, /getLocationDisplayName\(district, preferThai\)/)
  assert.match(tracking, /language === 'th' \? step\.labelTh : step\.label/)
  assert.match(tracking, /toLocaleTimeString\(locale/)
})

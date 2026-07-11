import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getBrowserDefaultMobileLanguage,
  getStoredMobileLanguage,
  MOBILE_LANGUAGE_PREFERENCE_KEY,
} from '../shared/i18n/mobile/preferences.ts'

test('uses English only when the browser language starts with en', () => {
  assert.equal(getBrowserDefaultMobileLanguage('en-US'), 'en')
  assert.equal(getBrowserDefaultMobileLanguage('en-GB'), 'en')
  assert.equal(getBrowserDefaultMobileLanguage('th-TH'), 'th')
  assert.equal(getBrowserDefaultMobileLanguage('ja-JP'), 'th')
})

test('uses a valid stored mobile preference before the browser default', () => {
  const storage = new Map([[MOBILE_LANGUAGE_PREFERENCE_KEY, 'en']])

  assert.equal(getStoredMobileLanguage(storage, 'th-TH'), 'en')
})

test('ignores invalid stored language values and never uses the admin preference key', () => {
  const storage = new Map([
    [MOBILE_LANGUAGE_PREFERENCE_KEY, 'fr'],
    ['admin_settings_preferences', '{"language":"en"}'],
  ])

  assert.equal(getStoredMobileLanguage(storage, 'th-TH'), 'th')
})

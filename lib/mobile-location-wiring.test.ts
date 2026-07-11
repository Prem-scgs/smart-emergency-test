/**
 * ???? mobile location/create/tracking wiring ???? ?????? fallback coords ??? native tel flow.
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const mobileAppUrl = new URL('../widgets/mobile-emergency/ui/mobile-app.tsx', import.meta.url)
const incidentSelectionUrl = new URL('../widgets/mobile-emergency/ui/incident-selection-screen.tsx', import.meta.url)
const splashUrl = new URL('../widgets/mobile-emergency/ui/splash-screen.tsx', import.meta.url)

test('mobile incidents never use fallback coordinates', async () => {
  const source = await readFile(mobileAppUrl, 'utf8')

  assert.doesNotMatch(source, /FALLBACK_LOCATION/)
  assert.match(source, /useState<MobileLocation \| null>\(\s*null,?\s*\)/)
  assert.match(source, /if \(!currentLocation \|\| locationStatus !== ["']locked["']\)/)
})

test('mobile splash reflects real GPS state instead of timers', async () => {
  const source = await readFile(splashUrl, 'utf8')

  assert.doesNotMatch(source, /setTimeout/)
  assert.match(source, /locationStatus: LocationLockStatus/)
  assert.match(source, /onRetry: \(\) => void/)
  assert.match(source, /onContinueWithoutLocation: \(\) => void/)
})

test('mobile keeps central contacts available without GPS', async () => {
  const source = await readFile(mobileAppUrl, 'utf8')

  assert.match(source, /const isGlobalContact/)
  assert.match(source, /loadContacts\(null\)/)
  assert.match(source, /apiContacts = apiContacts\.filter\(isGlobalApiContact\)/)
})

test('mobile call button uses a native tel link while preserving the app call handler', async () => {
  const source = await readFile(incidentSelectionUrl, 'utf8')
  const mobileAppSource = await readFile(mobileAppUrl, 'utf8')

  assert.match(source, /function buildTelUrl/)
  assert.match(source, /href=\{buildTelUrl\(contact\.phoneNumber\)\}/)
  assert.match(source, /event\.preventDefault\(\)/)
  assert.match(source, /await onCall\(contact\)/)
  assert.match(source, /window\.location\.assign\(buildTelUrl\(contact\.phoneNumber\)\)/)
  assert.match(mobileAppSource, /startCallFlow\(contact, selectedCategory\)/)
  assert.match(mobileAppSource, /buildIncidentCallUpdatePayload/)
  assert.match(mobileAppSource, /\/api\/incidents\/\$\{pendingCallResult\.incidentId\}\/call/)
  assert.match(mobileAppSource, /ผลการโทรเป็นอย่างไร\?/)
  assert.doesNotMatch(mobileAppSource, /EmergencyCallScreen/)
  assert.doesNotMatch(mobileAppSource, /setScreen\('call'\)/)
  assert.doesNotMatch(mobileAppSource, /\| 'call'/)
  assert.doesNotMatch(source, /<Button onClick=\{\(\) => onCall\(contact\)\}/)
})

test('mobile tracking displays readable case numbers instead of full UUIDs', async () => {
  const trackingSource = await readFile(
    new URL('../widgets/mobile-emergency/ui/incident-tracking-screen.tsx', import.meta.url),
    'utf8'
  )

  assert.match(trackingSource, /getMobileIncidentDisplayNumber/)
  assert.match(trackingSource, /caseNumber/)
  assert.doesNotMatch(trackingSource, /หมายเลขเหตุ: \{incidentId\}/)
})

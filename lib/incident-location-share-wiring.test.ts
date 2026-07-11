/**
 * ???? production location sharing card/helper path ??????????????? legacy implementation.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)

test('tracking owns the incident location share card', async () => {
  const tracking = await readFile(
    new URL('widgets/mobile-emergency/ui/incident-tracking-screen.tsx', root),
    'utf8',
  )

  assert.match(tracking, /IncidentLocationShareCard/)
  assert.match(tracking, /incident=\{incidentDetail\}/)
})

test('standalone legacy location sharing is removed from the mobile flow', async () => {
  const [mobileApp, mobileNav, incidentSelection] = await Promise.all([
    readFile(new URL('widgets/mobile-emergency/ui/mobile-app.tsx', root), 'utf8'),
    readFile(new URL('widgets/mobile-emergency/ui/mobile-nav.tsx', root), 'utf8'),
    readFile(new URL('widgets/mobile-emergency/ui/incident-selection-screen.tsx', root), 'utf8'),
  ])

  assert.doesNotMatch(mobileApp, /LocationSharingScreen|location-share|handleShareLocation/)
  assert.doesNotMatch(mobileNav, /'location'|ตำแหน่ง/)
  assert.doesNotMatch(incidentSelection, /onShareLocation|Share Location/)
})

test('share card keeps unavailable channels disabled and protects optional phone sharing', async () => {
  const card = await readFile(
    new URL('features/location-sharing/ui/incident-location-share-card.tsx', root),
    'utf8',
  )

  assert.match(card, /useState\(false\)/)
  assert.match(card, /disabled=\{isLoading \|\| !availability\[id\]\.enabled \|\| pendingChannel !== null\}/)
  assert.match(card, /ยังไม่เปิดใช้งาน/)
  assert.match(card, /isValidThaiReporterPhone/)
  assert.match(card, /บันทึกประวัติการแชร์ไม่สำเร็จ/)
  assert.match(card, /เปิดต่อ/)
  assert.match(card, /shouldCopyMessageBeforeOpeningChannel\(payload\.channel, platform\)/)
})

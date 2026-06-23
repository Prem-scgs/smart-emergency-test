import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const mobileAppPath = new URL('../components/mobile/mobile-app.tsx', import.meta.url)
const shareScreenPath = new URL('../components/mobile/location-sharing-screen.tsx', import.meta.url)

test('legacy share screen remains available for cleanup review but is not wired into MobileApp', async () => {
  const [mobileApp, shareScreen] = await Promise.all([
    readFile(mobileAppPath, 'utf8'),
    readFile(shareScreenPath, 'utf8'),
  ])

  assert.doesNotMatch(mobileApp, /LocationSharingScreen/)
  assert.match(shareScreen, /id:\s*'sms'/)
  assert.match(shareScreen, /buildSmsLocationShareUrl\(location\)/)
  assert.match(shareScreen, /id:\s*'line'/)
  assert.match(shareScreen, /id:\s*'whatsapp'/)
  assert.doesNotMatch(shareScreen, /id:\s*'telegram'/)
  assert.doesNotMatch(shareScreen, /buildTelegramLocationShareUrl/)
})

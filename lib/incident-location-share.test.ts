import test from 'node:test'
import assert from 'node:assert/strict'

// @ts-ignore -- executed by node with tsx from the backend workspace
import {
  buildIncidentShareAttemptUrl,
  buildIncidentShareCopyMessage,
  buildShareChannelsUrl,
  detectMobilePlatform,
  isValidThaiReporterPhone,
  shouldCopyMessageBeforeOpeningChannel,
} from './incident-location-share.ts'

const incident = {
  caseNumber: 'SE-260704-0007',
  category: 'medical',
  province: 'กรุงเทพมหานคร',
  district: 'ปทุมวัน',
  latitude: 13.7478,
  longitude: 100.5351,
  createdAt: '2026-06-21T03:42:00.000Z',
}

test('builds share API URLs from the emergency gateway', () => {
  assert.equal(
    buildShareChannelsUrl('/emergency-api'),
    '/emergency-api/api/reference/share-channels',
  )
  assert.equal(
    buildIncidentShareAttemptUrl('/emergency-api', 'SE-260704-0007'),
    '/emergency-api/api/incidents/SE-260704-0007/share-attempts',
  )
})

test('validates Thai reporter phone numbers with 9 or 10 digits', () => {
  assert.equal(isValidThaiReporterPhone('021234567'), true)
  assert.equal(isValidThaiReporterPhone('0812345678'), true)
  assert.equal(isValidThaiReporterPhone('123'), false)
  assert.equal(isValidThaiReporterPhone('+66812345678'), false)
})

test('detects iOS and defaults other mobile browsers to Android format', () => {
  assert.equal(detectMobilePlatform('Mozilla/5.0 (iPhone)'), 'ios')
  assert.equal(detectMobilePlatform('Mozilla/5.0 (Linux; Android 15)'), 'android')
  assert.equal(detectMobilePlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), 'desktop')
})

test('copies Thai text before opening LINE only on desktop', () => {
  assert.equal(shouldCopyMessageBeforeOpeningChannel('line', 'desktop'), true)
  assert.equal(shouldCopyMessageBeforeOpeningChannel('line', 'ios'), false)
  assert.equal(shouldCopyMessageBeforeOpeningChannel('sms', 'desktop'), false)
})

test('builds a copy fallback from the incident snapshot and optional phone', () => {
  const withoutPhone = buildIncidentShareCopyMessage(incident)
  const withPhone = buildIncidentShareCopyMessage({ ...incident, reporterPhone: '0812345678' })

  assert.match(withoutPhone, /หมายเลขเหตุ: SE-260704-0007/)
  assert.match(withoutPhone, /13\.747800, 100\.535100/)
  assert.doesNotMatch(withoutPhone, /เบอร์ผู้แจ้ง/)
  assert.match(withPhone, /เบอร์ผู้แจ้ง: 0812345678/)
})

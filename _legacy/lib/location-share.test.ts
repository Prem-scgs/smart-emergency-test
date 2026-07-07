import assert from 'node:assert/strict'
import test from 'node:test'

// @ts-ignore -- executed by node with tsx from the workspace test command
import { buildSmsLocationShareUrl } from './location-share.ts'

test('buildSmsLocationShareUrl encodes the resolved area, coordinates and Google Maps link', () => {
  const url = new URL(buildSmsLocationShareUrl({
    latitude: 13.7478,
    longitude: 100.5351,
    district: 'ปทุมวัน',
    province: 'กรุงเทพมหานคร',
  }))

  assert.equal(url.protocol, 'sms:')
  assert.equal(
    url.searchParams.get('body'),
    'ตำแหน่งฉุกเฉิน\nพื้นที่: ปทุมวัน, กรุงเทพมหานคร\nพิกัด: 13.747800, 100.535100\nhttps://maps.google.com/?q=13.747800,100.535100',
  )
})

test('buildSmsLocationShareUrl omits the area line when no location name is resolved', () => {
  const url = new URL(buildSmsLocationShareUrl({ latitude: 16.8369, longitude: 100.2365 }))

  assert.equal(
    url.searchParams.get('body'),
    'ตำแหน่งฉุกเฉิน\nพิกัด: 16.836900, 100.236500\nhttps://maps.google.com/?q=16.836900,100.236500',
  )
})

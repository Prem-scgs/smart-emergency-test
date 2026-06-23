# SMS Location Share Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Mobile Telegram location-share action with a prefilled SMS composer using the existing live GPS value.

**Architecture:** Rename the share helper to a channel-neutral location-share helper. It owns coordinate formatting, Google Maps URLs, SMS body text and SMS URI construction. The existing screen retains its current LINE/WhatsApp actions and routes the SMS option through the browser's `sms:` URI.

**Tech Stack:** Next.js 16, React 19, TypeScript, Lucide, Node test runner with `tsx`.

---

## File Structure

- Create: `lib/location-share.ts` - location URL and SMS builders
- Create: `lib/location-share.test.ts` - pure helper tests
- Modify: `components/mobile/location-sharing-screen.tsx` - swap Telegram button/action for SMS
- Modify: `lib/location-sharing-wiring.test.ts` - static UI contract
- Delete: `lib/telegram-location-share.ts` - superseded channel-specific helper
- Delete: `lib/telegram-location-share.test.ts` - superseded Telegram contract
- Modify: `CODEX_HANDOFF.md` - record result after verification

### Task 1: Lock the SMS contract with failing tests

**Files:**
- Create: `lib/location-share.test.ts`
- Modify: `lib/location-sharing-wiring.test.ts`

- [x] **Step 1: Write the failing helper tests**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'

// @ts-ignore -- executed by node with tsx from the backend workspace
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
```

- [x] **Step 2: Update the failing UI wiring guard**

```ts
assert.match(shareScreen, /id:\s*'sms'/)
assert.match(shareScreen, /buildSmsLocationShareUrl\(location\)/)
assert.doesNotMatch(shareScreen, /id:\s*'telegram'/)
assert.doesNotMatch(shareScreen, /buildTelegramLocationShareUrl/)
```

- [x] **Step 3: Run focused tests and confirm RED**

```powershell
rtk pnpm --filter emergency-api exec node --import tsx --test ../../lib/location-share.test.ts ../../lib/location-sharing-wiring.test.ts
```

Expected: FAIL because `location-share.ts` and SMS UI wiring do not exist.

### Task 2: Implement the channel-neutral helper

**Files:**
- Create: `lib/location-share.ts`
- Test: `lib/location-share.test.ts`

- [x] **Step 1: Implement minimal builders**

```ts
export interface LocationShareLocation {
  latitude: number
  longitude: number
  district?: string
  province?: string
}

export function formatLocationCoordinates(location: LocationShareLocation) {
  return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
}

export function buildGoogleMapsLocationUrl(location: LocationShareLocation) {
  return `https://maps.google.com/?q=${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}`
}

export function buildSmsLocationShareUrl(location: LocationShareLocation) {
  const area = [location.district, location.province].filter(Boolean).join(', ')
  const body = [
    'ตำแหน่งฉุกเฉิน',
    area ? `พื้นที่: ${area}` : null,
    `พิกัด: ${formatLocationCoordinates(location)}`,
    buildGoogleMapsLocationUrl(location),
  ].filter((line): line is string => Boolean(line)).join('\n')

  return `sms:?${new URLSearchParams({ body }).toString()}`
}
```

- [x] **Step 2: Run the helper test and confirm GREEN**

```powershell
rtk pnpm --filter emergency-api exec node --import tsx --test ../../lib/location-share.test.ts
```

Expected: PASS, 2 tests.

### Task 3: Replace the UI channel and remove legacy files

**Files:**
- Modify: `components/mobile/location-sharing-screen.tsx`
- Modify: `lib/location-sharing-wiring.test.ts`
- Delete: `lib/telegram-location-share.ts`
- Delete: `lib/telegram-location-share.test.ts`

- [x] **Step 1: Import the SMS helper and neutral type**

```tsx
import { MessageCircle, MessageSquare } from 'lucide-react'
import {
  buildGoogleMapsLocationUrl,
  buildSmsLocationShareUrl,
  formatLocationCoordinates,
  type LocationShareLocation,
} from '@/lib/location-share'

interface LocationSharingScreenProps {
  onBack: () => void
  location: LocationShareLocation
}
```

- [x] **Step 2: Replace only the Telegram share option**

```tsx
{
  id: 'sms',
  name: 'SMS',
  icon: MessageSquare,
  color: 'bg-sky-600 hover:bg-sky-700',
  action: () => {
    window.location.href = buildSmsLocationShareUrl(location)
  },
}
```

- [x] **Step 3: Delete the two Telegram-only files after imports are updated**

```powershell
Remove-Item -LiteralPath lib/telegram-location-share.ts, lib/telegram-location-share.test.ts
```

- [x] **Step 4: Run the wiring guard and confirm GREEN**

```powershell
rtk pnpm --filter emergency-api exec node --import tsx --test ../../lib/location-sharing-wiring.test.ts
```

Expected: PASS, 1 test.

### Task 4: Verify and record

**Files:**
- Modify: `CODEX_HANDOFF.md`

- [x] **Step 1: Run focused regression tests**

```powershell
rtk pnpm --filter emergency-api exec node --import tsx --test ../../lib/location-share.test.ts ../../lib/location-sharing-wiring.test.ts
```

Expected: PASS, 3 tests.

- [x] **Step 2: Run build and whitespace validation**

```powershell
rtk pnpm build
rtk git diff --check
```

Expected: both commands exit 0.

- [ ] **Step 3: Manual mobile QA**

1. Open `http://localhost:3000` and navigate to location sharing.
2. Confirm the grid shows Line, SMS and WhatsApp only.
3. Click SMS on a mobile-capable browser/device.
4. Confirm the message composer receives the area, six-decimal coordinates and Google Maps URL; it must not send automatically.
5. Confirm Line, WhatsApp and Google Maps actions still open their existing destinations.

- [x] **Step 4: Update handoff and wait for separate Git confirmation**

Record the SMS behavior and test evidence in `CODEX_HANDOFF.md`. Do not commit or push until Prem confirms the Git identity/email and Thai commit message.

# SMS Location Share Design

> Historical/spec-only note: เอกสารนี้เก็บ design เก่าของการแชร์ตำแหน่งผ่าน SMS
> ก่อน production flow ปัจจุบันจะย้ายมาใช้ `features/location-sharing`
> และ backend `POST /api/incidents/:id/share-attempts`

## Goal

เดิมต้องการให้ Mobile แชร์ตำแหน่งเหตุฉุกเฉินผ่าน SMS ได้ โดยสร้างข้อความที่มีพื้นที่, พิกัด และ Google Maps URL แล้วเปิด native SMS composer ให้ผู้ใช้กดส่งเอง

## Scope เดิม

- รับ GPS และชื่อพื้นที่จาก mobile flow
- คง LINE และ WhatsApp ไว้
- แทน Telegram ด้วย SMS
- เปิด deep link `sms:?body=...`
- ไม่ส่ง SMS อัตโนมัติ

## Current Runtime Status

ระบบปัจจุบันไม่ได้ใช้ legacy screen/helper ตาม design นี้แล้ว

Current owner:

- UI card: `features/location-sharing/ui/incident-location-share-card.tsx`
- helper/business logic: `features/location-sharing`
- backend attempt endpoint: `POST /api/incidents/:id/share-attempts`
- public channel availability: `GET /api/reference/share-channels`
- admin channel settings: `GET/PUT /api/admin/share-channels`

## Why Keep This File

เก็บไว้เพื่ออธิบายว่าทำไมระบบ location sharing เคยพูดถึง SMS/native composer และเหตุผลที่ production flow ต้องมี fallback/copy message

ถ้าจะแก้ production sharing ตอนนี้ ให้เริ่มจาก:

- [API_CONTRACT.md](../api/API_CONTRACT.md)
- [ARCHITECTURE_OVERVIEW.md](../architecture/ARCHITECTURE_OVERVIEW.md)
- `features/location-sharing`
- `services/emergency-api/src/location-share.ts`
- `services/emergency-api/src/share-channel-settings.ts`

## Test After Changing Current Flow

- `node --test lib/incident-location-share.test.ts lib/incident-location-share-wiring.test.ts`
- `node --test lib/location-sharing-wiring.test.ts lib/mobile-tracking.test.ts`
- `pnpm build`

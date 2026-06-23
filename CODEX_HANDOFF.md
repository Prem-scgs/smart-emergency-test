# Codex Handoff

อัปเดตล่าสุด: 2026-06-23

## Project State

- Repository: `https://github.com/SCGS7788/smart-emergency.git`
- Workspace: `D:\testwork_Fullstack(SCSG)\smart-emergency`
- Branch: `Prem(scgs)-emergencyV0` (ห้ามแตะ `main`)
- Latest pushed commit: `715a730 fix: แก้การเชื่อมต่อ SSE ซ้ำในฝั่งแอดมิน`
- Working tree: มีงาน Mobile/API/Share Location/docs จำนวนมากที่ยังไม่ commit; มี document rename ถูก stage อยู่แล้ว 8 ไฟล์
- ห้าม commit, push, reset, checkout, switch account หรือแก้ production state จนกว่าเปรมยืนยัน

## Current Objective

ทำ checkpoint Git แบบแยก scope ให้ปลอดภัย แล้วทำ Mobile end-to-end test ผ่าน HTTPS deployment ที่เหมาะสมก่อนเริ่ม Docker production stack

## Completed Since Last Push

- Admin ใช้ SSE connection เดียว; legacy `use-websocket` ถูกลบและชื่อ/type/comment ถูกปรับให้เป็น SSE
- Mobile ใช้ same-origin API gateway `/emergency-api` ผ่าน Next rewrite ไป Fastify; CORS, History, Tracking และ SSE รองรับ Mobile/LAN
- ลบ fallback GPS; Mobile ใช้ Browser Geolocation จริงและห้ามสร้าง incident หาก location ไม่ locked
- เพิ่ม Incident Tracking, status history, version conflict และ SSE status sync ระหว่าง Admin/Mobile
- เพิ่ม Share Location ในหน้า Incident Tracking ใช้ location snapshot จาก incident:
  - LINE, SMS, WhatsApp เป็น manual flow: ผู้ใช้เลือกช่องทางแล้วส่งเอง
  - config optional: `LINE_OA_ID`, `SMS_CENTER_PHONE`, `WHATSAPP_CENTER_PHONE`
  - API ไม่เปิดเผย recipient, มี ownership, audit และ rate limit 10 ครั้ง/นาที
  - toggle แนบเบอร์เริ่มปิด และ audit ไม่เก็บ reporter phone ใน details
- LINE Desktop รับข้อความไทยผ่าน deep link ไม่เสถียร: implementation ปัจจุบันเปิด OA โดยไม่ส่ง payload และคัดลอกข้อความให้วางเอง; Mobile ยังใช้ deep link พร้อมข้อความ
- ลบ mkcert และ Cloudflare Tunnel แล้ว รวมถึง `dev:https`, local HTTPS script/spec/plan และ references ใน README; ไม่มี process tunnel ค้าง

## Verification Evidence

- API tests: `pnpm test:api` ผ่าน 68/68 หลังงาน Share Location
- Share Location focused tests: ผ่าน 8/8
- GPS focused tests หลัง rollback การทดลอง iPhone ล่าสุด: ผ่าน 6/6
- `pnpm build` ผ่านล่าสุดหลังลบ mkcert/Cloudflare references
- `pnpm exec tsc --noEmit` ยัง error เดิมนอก scope ใน GIS/User Profile; Next build ตั้ง `typescript.ignoreBuildErrors: true`

## Important Decisions

- Realtime ใช้ SSE เท่านั้น ห้ามเพิ่ม WebSocket โดยไม่ปรึกษา
- Mobile ไม่ต้อง login; ownership ของ History/Tracking อิง reporter session ใน browser จึงไม่เห็นเคสจากคอมบนมือถือเครื่องใหม่ เป็น behavior เพื่อ privacy
- Share Location เป็น manual user-send flow ไม่ใช้ LINE Messaging API หรือ WhatsApp Business API
- ห้ามใช้ fallback coordinates
- iPhone GPS ผ่าน LAN HTTP ไม่ใช่ secure context; local HTTPS/tunnel ถูกถอนตามคำสั่งเปรม ตอนนี้ยังไม่มีวิธีทดสอบ GPS บน iPhone ที่ active
- หากจะ deploy: แนวที่เปรมสนใจคือ Docker Compose บน VPS (`web + api + PostGIS + Caddy`) แต่ยังไม่เริ่ม implement

## Exact Next Task

1. รายงานและขอเปรมยืนยัน checkpoint commit แยก scope ก่อน stage:
   - `feat: เชื่อม mobile กับ API จริงและเพิ่มการล็อกตำแหน่ง`
   - `feat: เพิ่มการแชร์จุดเกิดเหตุผ่าน LINE SMS และ WhatsApp`
   - `docs: จัดโครงเอกสารและมาตรฐาน UTF-8`
2. ก่อน commit ให้ตรวจ changed-file list; ห้าม stage `.env`, `_local/`, logs, certs หรือ legacy/obsolete docs โดยไม่ยืนยัน
3. หลัง checkpoint ค่อยออกแบบ Docker production stack ด้วย `$brainstorming` และแผนแยก

## Pending Work

- ทดสอบ provider จริงบน mobile HTTPS: LINE, SMS, WhatsApp
- `POST /api/incidents/:id/locations`
- Dashboard queue grouping/unread
- Contacts CRUD role enforcement
- Auth จริงเป็นงานทีมเปรม; รักษา integration boundary
- ตัดสินใจ legacy `components/mobile/location-sharing-screen.tsx` และ helper/tests เก่าก่อนลบ
- FSD migration เป็นงานแยก ไม่เริ่มเอง

## Relevant Files

- Share card: `components/mobile/incident-location-share-card.tsx`
- Share client helper/tests: `lib/incident-location-share.ts`, `lib/incident-location-share.test.ts`, `lib/incident-location-share-wiring.test.ts`
- Share API/helper/tests: `services/emergency-api/src/location-share.ts`, `services/emergency-api/src/location-share.test.ts`, `services/emergency-api/src/modules/incidents/routes.ts`
- API gateway: `lib/emergency-api-url.ts`, `next.config.mjs`
- GPS: `components/mobile/mobile-app.tsx`, `components/mobile/splash-screen.tsx`, `lib/mobile-location.ts`
- Production references: `docs/operations/PRODUCTION_CHECKLIST.md`, `docs/operations/RUNBOOK.md`

## Commands

```powershell
rtk git status --short --branch
rtk git log -1 --oneline
pnpm db:up
pnpm dev
pnpm dev:api
pnpm test:api
pnpm build
```

## Safety Rules

- เรียกผู้ใช้ว่า "เปรม" และถามเป็นภาษาไทย
- อ่าน/เขียนไทยด้วย UTF-8
- อ่าน `C:\Users\User\.codex\RTK.md`; prefix shell commands ด้วย `rtk`
- ห้ามแตะ `main`
- อย่าลบ/ย้ายไฟล์ที่ไม่อยู่ใน scope หรือ commit งานปนกัน
- ไม่เปิดเผย `.env`, token, phone, session ID หรือพิกัดผู้ใช้

## Suggested Skills

- `$token-lean-workflow` สำหรับทำงานต่อแบบประหยัด context
- `$brainstorming` ก่อน Docker/FSD/ช่องทางแชร์ใหม่
- `$verification-before-completion` ก่อนรายงานผลหรือ commit
- `$handoff` เมื่อสลับบัญชีหรือ compact context

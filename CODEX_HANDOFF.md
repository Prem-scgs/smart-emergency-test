# Codex Handoff

อัปเดตล่าสุด: 2026-06-24

## Project State

- Repository: `https://github.com/SCGS7788/smart-emergency.git`
- Workspace: `D:\testwork_Fullstack(SCSG)\smart-emergency`
- Branch: `Prem(scgs)-emergencyV0` (ห้ามแตะ `main`)
- Latest commit: `1f64c27 feat: ตัดหน้าแชร์ location มารวมไว้ใน หน้าติดตามสถานะ`
- Working tree: ยังมีไฟล์แก้ไข/ไฟล์ใหม่หลายชุดที่ยังไม่ commit รวมถึง Docker local stack, Admin SSE/Alert, Dashboard, Share Location, Contacts role scope
- ห้าม commit, push, reset, checkout, switch account หรือแก้ production state จนกว่าเปรมยืนยัน

## Current Objective

เตรียมระบบให้เป็น checkpoint ที่ปลอดภัย: Contacts page/API พร้อมใช้ตาม role แล้ว ขั้นถัดไปควรตรวจ changed files แยก scope ก่อน commit/push หรือเลือกทำงานค้างถัดไปทีละเรื่อง

## Completed Recently

- Admin realtime ใช้ SSE ทางเดียว; ลบ legacy `use-websocket`, เปลี่ยน type/comment/doc ให้ชัดว่าเป็น SSE
- Admin alert/detail flow:
  - เก็บ popup แบบใหม่ไว้ตัวเดียว
  - ปุ่ม “ดูรายละเอียด” เปิด `IncidentDetailPanel`
  - แก้การสลับเคสแล้วรายละเอียดไม่ครบ/อัปเดตสถานะไม่ได้
  - Notification drawer เปิดรายละเอียดเคสได้
- Dashboard:
  - แก้ runtime `Input is not defined`
  - เปลี่ยนช่องค้นหาพื้นที่และ tabs ให้ใช้ shadcn style
- Mobile/API/Share Location:
  - Mobile ใช้ API จริงผ่าน `/emergency-api`
  - Incident Tracking มีการ์ด Share Location: LINE/SMS/WhatsApp, copy fallback, snapshot location จาก incident
  - LINE desktop เปิด OA และให้คัดลอกข้อความเอง; mobile deep link ยังคงเป็น user-send flow
  - mkcert และ Cloudflare Tunnel ถูกลบออกแล้ว
- Docker local full stack:
  - เพิ่ม `Dockerfile.web`, `Dockerfile.api`, `docker-compose.local.yml`
  - ใช้ `docker compose -f docker-compose.yml -f docker-compose.local.yml ...`
  - เครื่อง Windows ของเปรมไม่มี `make` เป็นค่าเริ่มต้น ให้ใช้ docker compose command ตรง ๆ
- Contacts page/API เสร็จล่าสุด:
  - `/admin/contacts` เปลี่ยน UI เป็นภาษาไทย
  - ส่ง `buildAdminApiHeaders(user)` กับ `GET/POST/PUT/DELETE /api/contacts`
  - `super_admin` จัดการได้ทุกหน่วยงาน
  - `agency_admin` จัดการได้เฉพาะ category/หน่วยงานตัวเอง
  - ฟอร์มของ `agency_admin` lock category เป็นหน่วยงานตัวเอง
  - Backend enforce scope จริงและตอบ `403 CONTACT_FORBIDDEN` เมื่อข้ามสิทธิ์
  - `agency_admin` permissions ใน mock auth เพิ่ม `contacts.create/edit/delete` แล้ว แต่ backend ยังเป็นตัวล็อก scope หลัก

## Verification Evidence

- `node --import tsx --test src/modules/contacts/routes.test.ts` ผ่าน 5/5
- `pnpm test:api` ผ่าน 72/72
- `pnpm build` ผ่าน
- `pnpm build:api` ผ่าน
- Docker build `api web` ผ่าน และ restart containers แล้ว
- Health/API checks:
  - `GET http://localhost:4000/health` ได้ `ok: true`
  - `GET http://localhost:3000/admin/contacts` ได้ 200
  - `GET http://localhost:4000/api/contacts` พร้อม `x-admin-role: agency_admin`, `x-admin-category: medical` ได้ 200

## Exact Next Task

1. ถ้าจะขึ้น Git: ตรวจ changed-file list และแยก commit scope ก่อนเสมอ
   - ห้าม stage `.env`, logs, certs, local secrets หรือไฟล์ obsolete โดยไม่ถามเปรม
   - เสนอ commit text เป็นภาษาไทยให้เปรมเลือกก่อน
2. ถ้าจะทำฟีเจอร์ต่อ:
   - ตรวจ UI หน้า `/admin/contacts` สดใน browser ว่าหน้าตา/role flow ถูกใจเปรมหรือไม่
   - ทดสอบ role `super_admin` และ `agency_admin` ผ่านหน้า login mock
   - เลือกงานถัดไปจาก Pending Work ด้านล่าง

## Pending Work

- ทดสอบ provider จริงบน mobile HTTPS: LINE, SMS, WhatsApp
- `POST /api/incidents/:id/locations` สำหรับ location update ถ้าจะทำ tracking location เพิ่ม
- Dashboard queue grouping/unread
- Production deploy decision: Docker Compose บน VPS + Caddy/HTTPS ยังไม่เริ่ม
- Auth จริงเป็นงานทีมเปรม; รักษา integration boundary
- ตัดสินใจ legacy `components/mobile/location-sharing-screen.tsx` และ helper/tests เก่าก่อนลบ
- FSD/feature-sliced structure migration เป็นงานแยก ควรรอหลัง checkpoint Git หรือหลัง Docker เสถียร

## Relevant Files

- Contacts UI: `app/admin/(dashboard)/contacts/page.tsx`
- Contacts API/tests: `services/emergency-api/src/modules/contacts/routes.ts`, `services/emergency-api/src/modules/contacts/routes.test.ts`
- Mock role permissions: `lib/types.ts`
- Admin API scope helper: `lib/admin-api.ts`
- Dashboard UI: `app/admin/(dashboard)/dashboard/page.tsx`
- Alert/detail: `components/admin/alert-display.tsx`, `components/admin/incident-detail-panel.tsx`, `components/admin/notification-center.tsx`
- Share card: `components/mobile/incident-location-share-card.tsx`
- Share API/helper/tests: `services/emergency-api/src/location-share.ts`, `services/emergency-api/src/location-share.test.ts`, `services/emergency-api/src/modules/incidents/routes.ts`
- Docker local: `Dockerfile.web`, `Dockerfile.api`, `docker-compose.local.yml`

## Commands

```powershell
rtk proxy git status --short --branch
rtk proxy git log -1 --oneline
rtk proxy pnpm test:api
rtk proxy pnpm build
rtk proxy pnpm build:api
rtk proxy docker compose -f docker-compose.yml -f docker-compose.local.yml build api web
rtk proxy docker compose -f docker-compose.yml -f docker-compose.local.yml up -d api web
rtk proxy powershell -NoProfile -Command "(Invoke-WebRequest -UseBasicParsing 'http://localhost:3000/admin/contacts').StatusCode"
```

## Safety Rules

- เรียกผู้ใช้ว่า “เปรม” และถามเป็นภาษาไทย
- อ่าน/เขียนไทยด้วย UTF-8
- อ่าน `C:\Users\User\.codex\RTK.md`; prefix shell commands ด้วย `rtk`
- Repo จริงอยู่ที่ `D:\testwork_Fullstack(SCSG)\smart-emergency`; บาง session cwd อาจเป็น `C:\Users\User\Documents\smart-emergency`
- ห้ามแตะ `main`
- ห้าม commit/push จนกว่าเปรมยืนยัน
- อย่าลบ/ย้ายไฟล์ที่ไม่อยู่ใน scope หรือ commit งานปนกัน
- ไม่เปิดเผย `.env`, token, phone, session ID หรือพิกัดผู้ใช้
- Realtime ใช้ SSE เท่านั้น ห้ามเพิ่ม WebSocket โดยไม่ปรึกษา

## Suggested Skills

- `$token-lean-workflow` สำหรับทำงานต่อแบบประหยัด context
- `$brainstorming` ก่อน Docker production/FSD/ฟีเจอร์ใหม่
- `$verification-before-completion` ก่อนรายงานผลหรือ commit
- `$handoff` เมื่อสลับบัญชีหรือ compact context

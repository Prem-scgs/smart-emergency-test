# Codex Handoff

อัปเดตล่าสุด: 2026-06-28

## Project State

- Repository: `https://github.com/SCGS7788/smart-emergency.git`
- Workspace จริง: `D:\testwork_Fullstack(SCSG)\smart-emergency`
- Branch: `Prem(scgs)-emergencyV0` (ห้ามแตะ `main`)
- Latest commit: `16e3606 feat: แยกภาษา Contacts ไทยอังกฤษให้ชัดเจน`
- Current objective: Settings เฟส 2 เสร็จแล้ว: `super_admin` จัดการช่องทางศูนย์ LINE/SMS/WhatsApp ผ่าน UI/API/DB ได้
- Current checkpoint: งาน i18n/polish หน้า GIS, Call Logs, Reports, Settings + Settings เฟส 2 เสร็จแล้ว แต่ยังไม่ commit/push รอบล่าสุด

## Completed Since Latest Commit

- GIS:
  - ปรับหน้า `app/admin/(dashboard)/gis/page.tsx`
  - ปรับ `components/admin/gis-boundary-map.tsx`
  - เพิ่ม/ปรับ i18n keys ใน `lib/admin-i18n.tsx`
  - ใช้ชื่อจังหวัด/อำเภอภาษาไทย/อังกฤษจาก master location ตามภาษาที่เลือก
  - แก้ dropdown จังหวัดให้แสดงชื่อ ไม่ใช่ code เช่น `38`
  - แก้ panel รายการพื้นที่ให้สูงเต็มกรอบ ไม่เหลือช่องดำด้านล่าง
  - เพิ่ม/ปรับ `lib/gis-page-wiring.test.mjs`

- Call Logs:
  - ปรับ `app/admin/(dashboard)/call-logs/page.tsx`
  - เพิ่ม i18n แยก Thai/English
  - เพิ่ม pagination
  - เพิ่ม export CSV/PDF/Print ให้เลือกจากปุ่มเดียว
  - ตัด detail ออกจาก export ตามที่เปรมสั่ง
  - แก้ Export dropdown ให้ใช้งานได้จริง
  - เพิ่ม `lib/call-logs-page-wiring.test.mjs`

- Reports:
  - ปรับ `app/admin/(dashboard)/reports/page.tsx`
  - เพิ่ม i18n แยก Thai/English
  - เพิ่ม CSV/PDF/Print export
  - แก้ print ให้เปิด Chrome print dialog แทนหน้าว่าง `about:blank`
  - PDF ใช้ print stylesheet/preview ที่อ่านง่ายขึ้น
  - ปรับ category labels จาก master category ตามภาษาที่เลือก
  - ปรับ `lib/reports-page-wiring.test.mjs`

- Settings:
  - ปรับ `app/admin/(dashboard)/settings/page.tsx`
  - เพิ่ม i18n แยก Thai/English
  - ทำเสียง Alert เป็น user preference:
    - เปิด/ปิดเสียง
    - เลือกรูปแบบเสียง
    - ทดสอบเสียง
    - ต้องกดบันทึกก่อนค่าถูก persist
  - ตัด/ซ่อน reduce animation ตามที่เปรมไม่ต้องการ
  - `rg` ไม่พบ hardcoded Thai ใน settings page แล้ว
  - ปรับ `lib/settings-page-wiring.test.mjs`

- Settings เฟส 2:
  - เพิ่ม DB-backed center share channels สำหรับ LINE/SMS/WhatsApp
  - เพิ่ม migration `017_center_share_channels.sql`
  - เพิ่ม Admin API `GET/PUT /api/admin/share-channels` เฉพาะ `super_admin`
  - Public `/api/reference/share-channels` อ่าน DB ก่อน fallback `.env` และยังไม่ expose recipient
  - `POST /api/incidents/:id/share-attempts` ใช้ DB recipient ก่อน fallback `.env`
  - Settings UI แสดง masked value, source, toggle enabled และช่อง replace value
  - Audit log การแก้ไขโดยไม่เก็บ recipient เต็ม

## Verification ล่าสุด

เคยรันแล้วผ่านก่อน handoff:

```powershell
rtk proxy powershell -NoProfile -Command "pnpm exec node --test lib/settings-page-wiring.test.mjs lib/reports-page-wiring.test.mjs lib/call-logs-page-wiring.test.mjs lib/admin-i18n-wiring.test.mjs"
rtk proxy powershell -NoProfile -Command "pnpm build"
rtk proxy docker compose --project-directory "D:\testwork_Fullstack(SCSG)\smart-emergency" -f "D:\testwork_Fullstack(SCSG)\smart-emergency\docker-compose.yml" -f "D:\testwork_Fullstack(SCSG)\smart-emergency\docker-compose.local.yml" build web
rtk proxy docker compose --project-directory "D:\testwork_Fullstack(SCSG)\smart-emergency" -f "D:\testwork_Fullstack(SCSG)\smart-emergency\docker-compose.yml" -f "D:\testwork_Fullstack(SCSG)\smart-emergency\docker-compose.local.yml" up -d web
```

ผลที่ตรวจแล้ว:

- Settings/Reports/Call Logs/Admin i18n tests ผ่าน `26/26`
- `pnpm build` ผ่าน
- Docker `web` rebuild/restart ผ่าน
- HTTP checks:
  - `/admin/settings` ได้ `200`
  - `/admin/reports` ได้ `200`
  - `/admin/gis` ได้ `200`
- Docker/API checks:
  - apply migration 017 สำเร็จ
  - `/health` ได้ `ok: true`
  - `/api/admin/share-channels` ตอบ masked values ด้วย `x-admin-role: super_admin`
  - rebuild/restart Docker `api` และ `web` สำเร็จ
- เปรมตรวจหน้าจอแล้ว:
  - GIS ผ่าน
  - Reports/Print ผ่าน
  - Settings เสียง Alert และภาษาใช้งานได้ตาม flow ล่าสุด

## Current Git Status

ยังไม่ commit/push งานรอบล่าสุด

```text
 M app/admin/(dashboard)/call-logs/page.tsx
 M app/admin/(dashboard)/gis/page.tsx
 M app/admin/(dashboard)/reports/page.tsx
 M app/admin/(dashboard)/settings/page.tsx
 M components/admin/gis-boundary-map.tsx
 M lib/admin-i18n.tsx
 M lib/gis-page-wiring.test.mjs
 M lib/reports-page-wiring.test.mjs
 M lib/settings-page-wiring.test.mjs
?? lib/call-logs-page-wiring.test.mjs
```

## Exact Next Task

งานต่อที่แนะนำคือ Settings เฟส 3: สถานะระบบแบบ read-only สำหรับ `super_admin`

Acceptance criteria:

1. แยกสถานะระบบออกจาก mock ให้ชัด:
   - API health
   - Database connected
   - SSE connection status
2. แสดงเป็น read-only ไม่มี toggle หลอก
3. `agency_admin` ไม่เห็นสถานะระบบระดับ platform
4. ใช้ i18n ไทย/อังกฤษครบ
5. เพิ่ม/ปรับ wiring test
6. รัน frontend tests + API tests ที่เกี่ยวข้อง + `pnpm build`
7. ถ้าแก้ backend ให้ rebuild/restart Docker service ที่เกี่ยวข้อง

## Relevant Files For Next Task

- `app/admin/(dashboard)/settings/page.tsx`
- `lib/admin-i18n.tsx`
- `lib/settings-page-wiring.test.mjs`
- `services/emergency-api/src/config.ts`
- `services/emergency-api/src/modules/reference/routes.ts`
- `services/emergency-api/src/modules/reference/routes.test.ts`
- `services/emergency-api/src/modules/incidents/routes.ts`
- `services/emergency-api/src/modules/incidents/routes.test.ts`
- `services/emergency-api/src/modules/admin/share-channels.routes.ts`
- `services/emergency-api/src/modules/admin/share-channels.routes.test.ts`
- `services/emergency-api/src/share-channel-settings.ts`
- `services/emergency-api/db/migrations/017_center_share_channels.sql`
- `services/emergency-api/src/modules/contacts/routes.ts` (ดู pattern admin scope/headers)
- `services/emergency-api/src/db/*` หรือ migration folder ปัจจุบัน
- `docker-compose.local.yml`
- `Makefile`

## Important Existing Context

- Current env config keys:
  - `LINE_OA_ID`
  - `SMS_CENTER_PHONE`
  - `WHATSAPP_CENTER_PHONE`
- Current public endpoint:
  - `GET /api/reference/share-channels`
- Current share attempt endpoint:
  - `POST /api/incidents/:id/share-attempts`
- Settings page ตอนนี้ fetch สถานะช่องทางจาก `/api/reference/share-channels`
- Auth จริงยังไม่อยู่ใน scope ทีมอื่นจะทำ ภายในโปรเจกต์ใช้ mock/admin headers ผ่าน `buildAdminApiHeaders(user)`

## Pending Work After Next Task

- Settings เฟส 3: สถานะระบบแบบ read-only สำหรับ `super_admin`
  - API health
  - Database connected
  - SSE connection status
- Users page ยังเป็น mock/legacy และควรรอทีม Auth
- Production-ready cleanup/FSD folder structure ยังรอหลัง flow หลักนิ่ง
- Docker production/VPS/HTTPS/iPhone GPS ยังเป็นรอบถัดไป ไม่ใช่งานนี้

## Decisions

- Admin i18n ใช้ local browser preference ก่อน จนกว่าทีม Auth จะมี user preference จริง
- Dashboard/GIS/Contacts location display ต้องยึด master location จาก `provinceCode/districtCode`
- Realtime ใช้ SSE เท่านั้น ห้ามเพิ่ม WebSocket โดยไม่ถาม
- Docker local full stack ใช้งานอยู่ เปลี่ยน frontend/backend แล้วต้อง rebuild/restart service ที่เกี่ยวข้อง
- LINE/SMS/WhatsApp ใน Settings คือ “ช่องทางให้ประชาชนแชร์ location/ข้อมูลเคสกลับศูนย์” ไม่ใช่ระบบส่ง notification หา Admin

## Safety Rules

- เรียกผู้ใช้ว่า “เปรม” และตอบ/ถามเป็นภาษาไทย
- อ่าน/เขียนไทยด้วย UTF-8
- prefix shell commands ด้วย `rtk proxy`
- ห้ามแตะ `main`
- ห้าม reset/checkout/revert งานผู้ใช้โดยไม่ขอ
- ห้าม commit/push จนกว่าเปรมยืนยัน
- ก่อน commit/push ต้องเช็คไฟล์ที่จะขึ้น git ทุกครั้ง
- ห้ามเปิดเผย `.env`, token, phone จริง, session ID หรือพิกัดผู้ใช้
- ห้ามให้ UI เขียน `.env`
- ห้าม expose recipient/secret เต็มใน public API

## Suggested Skills

- `$token-lean-workflow` อ่านเฉพาะไฟล์เกี่ยวข้อง ลด token
- `$brainstorming` ถ้าต้องตัดสินใจ UX/API shape ก่อนลงมือ
- `$test-driven-development` เพราะงานนี้แตะ permission/config/DB
- `$supabase-postgres-best-practices` หรือ Postgres best practices เมื่อออก migration/index/constraint
- `$verification-before-completion` ก่อนบอกว่าเสร็จหรือก่อน commit/push
- `$handoff` เมื่อ compact หรือสลับบัญชี

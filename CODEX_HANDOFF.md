# Codex Handoff

อัปเดตล่าสุด: 2026-06-27

## Project State

- Repository: `https://github.com/SCGS7788/smart-emergency.git`
- Workspace: `D:\testwork_Fullstack(SCSG)\smart-emergency`
- Branch: `Prem(scgs)-emergencyV0` (ห้ามแตะ `main`)
- Latest commit before this publish: `e840577 feat: ปรับระบบแอดมิน contacts และ Docker local stack`
- Working tree before commit:

```text
M CODEX_HANDOFF.md
 M app/admin/(dashboard)/reports/page.tsx
 M app/admin/(dashboard)/settings/page.tsx
 M services/emergency-api/src/modules/incidents/routes.test.ts
 M services/emergency-api/src/modules/incidents/routes.ts
?? lib/reports-page-wiring.test.mjs
?? lib/settings-page-wiring.test.mjs
```

## Completed Recently

- ปรับหน้า Settings โดยคงโครงเดิม แต่ตัด mock/setting หลอกออก
- Settings ใช้ preference จริงสำหรับเสียง Alert, เลือกเสียง, ทดสอบเสียง, โหมดมืด, ลดแอนิเมชัน และภาษา
- Settings แยก role:
  - `agency_admin` เห็นเฉพาะการตั้งค่าส่วนตัว
  - `super_admin` เห็นช่องทางศูนย์และสถานะระบบด้วย
- Settings ดึงสถานะ LINE/SMS/WhatsApp จาก `/api/reference/share-channels`
- Settings ดึง API/DB health จาก `/health` และรับ SSE status จาก event หลัก ไม่เปิด SSE ซ้ำ
- ทำ Reports จาก DB จริงแล้ว
- เพิ่ม `GET /api/reports/summary`
  - ดึงจาก `incidents`
  - รองรับ `week | month | quarter | year`
  - เคารพ role scope: `super_admin` เห็นทั้งหมด, `agency_admin` เห็นเฉพาะ category ตัวเอง
- หน้า Reports ตัด mock data และแท็บผู้ปฏิบัติงานออก
- หน้า Reports แสดง KPI, trend, หมวดเหตุ และพื้นที่จาก API จริง
- Rebuild Docker images `api` และ `web` แล้ว และ recreate containers แล้ว

## Verification ล่าสุด

```powershell
rtk proxy node --test lib/reports-page-wiring.test.mjs lib/settings-page-wiring.test.mjs
rtk proxy pnpm --filter emergency-api test
rtk proxy pnpm build:api
rtk proxy pnpm build
rtk proxy docker compose -f docker-compose.yml -f docker-compose.local.yml build api web
rtk proxy docker compose -f docker-compose.yml -f docker-compose.local.yml up -d api web
```

ผลที่ได้:
- Frontend wiring tests ผ่าน 5/5
- API tests ผ่าน 74/74
- API build ผ่าน
- Next build ผ่าน
- Docker API/Web rebuild และ recreate แล้ว
- `GET http://localhost:4000/api/reports/summary?range=month` ตอบ `200` พร้อมข้อมูลจริงจาก DB
- `GET http://localhost:3000/admin/reports` ตอบ `200`

## Changed Files In Current Publish

- `app/admin/(dashboard)/settings/page.tsx`
- `app/admin/(dashboard)/reports/page.tsx`
- `services/emergency-api/src/modules/incidents/routes.ts`
- `services/emergency-api/src/modules/incidents/routes.test.ts`
- `lib/settings-page-wiring.test.mjs`
- `lib/reports-page-wiring.test.mjs`
- `CODEX_HANDOFF.md`

## Exact Next Task

แนะนำทำหน้า GIS ต่อแบบไม่รื้อใหญ่:

1. ตรวจหน้า `app/admin/(dashboard)/gis/page.tsx` ว่ายังมี mock/ส่วนวาด polygon ที่ควรตัดออกหรือไม่
2. คงเป้าหมาย GIS เป็น “ดูพื้นที่และขอบเขตจากข้อมูลจริง” ไม่ใช่ “วาดแก้ polygon”
3. ดึงข้อมูลพื้นที่/จังหวัด/อำเภอจาก reference/areas ที่มีอยู่
4. เคารพ role scope เหมือน Dashboard/Reports
5. เพิ่ม loading/error/empty state
6. ทำ regression tests ก่อนแก้

## Pending Work

- Reports export ยัง disabled อยู่
- Settings organization/timezone ยังไม่ได้ผูก DB เพราะต้องออกแบบ migration/API เพิ่ม
- Auto dispatch และ escalation ยังเป็น read-only note ยังไม่เปิดใช้จริง
- GIS ยังต้องปรับต่อ
- Production HTTPS/iPhone GPS ยังต้องทำในรอบ deploy/demo ถัดไป
- FSD/feature-sliced structure migration รอหลัง flow หลักนิ่ง

## Safety Rules

- เรียกผู้ใช้ว่า “เปรม” และถามเป็นภาษาไทย
- อ่าน/เขียนไทยด้วย UTF-8
- prefix shell commands ด้วย `rtk`
- ห้ามแตะ `main`
- ห้าม reset/checkout/revert งานผู้ใช้โดยไม่ขอ
- Realtime ใช้ SSE เท่านั้น ห้ามเพิ่ม WebSocket โดยไม่ปรึกษา
- ห้ามเปิดเผย `.env`, token, phone จริง, session ID หรือพิกัดผู้ใช้
- ก่อน commit/push ต้องเช็คไฟล์ที่จะขึ้น git ทุกครั้ง

## Suggested Skills

- `$brainstorming` ก่อนปรับ GIS/Reports/Settings เพิ่ม
- `$test-driven-development` ก่อนแก้ behavior
- `$verification-before-completion` ก่อนสรุปว่าเสร็จหรือก่อน commit/push
- `$handoff` เมื่อ compact หรือสลับบัญชี

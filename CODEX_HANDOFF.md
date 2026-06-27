# Codex Handoff

อัปเดตล่าสุด: 2026-06-27

## Project State

- Repository: `https://github.com/SCGS7788/smart-emergency.git`
- Workspace: `D:\testwork_Fullstack(SCSG)\smart-emergency`
- Branch: `Prem(scgs)-emergencyV0` (ห้ามแตะ `main`)
- Latest commit before this publish: `0b0e9a5 feat: เชื่อมหน้า Settings และ Reports กับข้อมูลจริง`
- Working tree before commit:

```text
 M app/admin/(dashboard)/contacts/page.tsx
 M app/admin/(dashboard)/gis/page.tsx
?? lib/contacts-location-select-wiring.test.mjs
?? lib/gis-page-wiring.test.mjs
```

## Completed Recently

- ปรับหน้า GIS เป็น read-only GIS viewer จาก DB จริง ไม่ใช่หน้าแก้หรือวาด polygon
- หน้า GIS ใช้ `/api/areas`, `/api/areas/:id/contacts`, `/api/areas/:id/incidents`
- ปรับข้อความหน้า GIS เป็นไทย และลดคำที่ทำให้เข้าใจว่าเป็นหน้าจัดการ polygon
- แก้ select จังหวัดในหน้า GIS ให้แสดงชื่อจังหวัดภาษาไทยแทน `provinceCode` เช่น `บึงกาฬ` แทน `38`
- แก้ layout การ์ด “พื้นที่บริการ” ใน GIS ไม่ให้ stretch สูงเท่าคอลัมน์ขวาแล้วเหลือช่องว่างดำด้านล่าง
- เพิ่ม list scroll ใน GIS จาก `420px` เป็น `520px`
- แก้ select จังหวัด/อำเภอในหน้า Contacts ให้แสดงชื่อไทยแทน code ด้วยวิธี render label ใน trigger โดยตรง
- เพิ่ม regression tests:
  - `lib/gis-page-wiring.test.mjs`
  - `lib/contacts-location-select-wiring.test.mjs`
- Rebuild และ recreate Docker `web` หลังแก้ UI แล้ว

## Verification ล่าสุด

```powershell
rtk proxy node --test lib/gis-page-wiring.test.mjs
rtk proxy node --test lib/contacts-location-select-wiring.test.mjs lib/reports-page-wiring.test.mjs lib/settings-page-wiring.test.mjs
rtk proxy pnpm build
rtk proxy docker compose -f docker-compose.yml -f docker-compose.local.yml build web
rtk proxy docker compose -f docker-compose.yml -f docker-compose.local.yml up -d web
```

ผลที่ได้:
- GIS wiring tests ผ่าน 4/4
- Contacts/Reports/Settings wiring tests ผ่าน 6/6
- Next build ผ่าน
- Docker `web` rebuild และ recreate แล้ว

## Changed Files In Current Publish

- `app/admin/(dashboard)/gis/page.tsx`
- `app/admin/(dashboard)/contacts/page.tsx`
- `lib/gis-page-wiring.test.mjs`
- `lib/contacts-location-select-wiring.test.mjs`
- `CODEX_HANDOFF.md`

## Exact Next Task

แนะนำทำหน้า Reports/GIS polish ต่อแบบเล็กและปลอดภัย:

1. เปิดดูหน้า `admin/gis` จริงหลัง Docker rebuild แล้วเช็ค visual ว่า:
   - select จังหวัดเป็นชื่อไทย
   - การ์ด “พื้นที่บริการ” ไม่เหลือช่องว่างดำยาว
   - map/list/detail อ่านง่ายบนจอเล็ก
2. ถ้า visual ผ่าน ให้เริ่มหน้า Reports ต่อ:
   - เพิ่ม empty/error/loading state ให้ละเอียดขึ้น
   - ออกแบบ export รายงานจริง หรือคง disabled พร้อมเหตุผลชัด
3. ก่อนแก้ behavior เพิ่ม test ก่อนเสมอ

## Pending Work

- Reports export ยัง disabled อยู่
- Settings organization/timezone ยังไม่ได้ผูก DB เพราะต้องออกแบบ migration/API เพิ่ม
- Auto dispatch และ escalation ยังเป็น read-only note ยังไม่เปิดใช้จริง
- GIS ยังเป็น read-only viewer; backend ยังมี `POST/PUT/DELETE /api/areas` legacy อยู่ แต่ UI ไม่ใช้แล้ว
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

- `$brainstorming` ก่อนปรับ UI/flow เพิ่ม
- `$test-driven-development` ก่อนแก้ behavior
- `$verification-before-completion` ก่อนสรุปว่าเสร็จหรือก่อน commit/push
- `$handoff` เมื่อ compact หรือสลับบัญชี

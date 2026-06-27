# Codex Handoff

อัปเดตล่าสุด: 2026-06-27

## Project State

- Repository: `https://github.com/SCGS7788/smart-emergency.git`
- Workspace: `D:\testwork_Fullstack(SCSG)\smart-emergency`
- Branch: `Prem(scgs)-emergencyV0` (ห้ามแตะ `main`)
- Latest commit before this publish: `80d9eb9 feat: ปรับหน้า GIS และแก้ select แสดงชื่อไทย`
- Current focus: หน้า Reports export จากข้อมูล DB จริง

## Completed Recently

- ปรับหน้า Reports ให้ export ได้จริงจากข้อมูล `/api/reports/summary`
- เพิ่มเมนู `ส่งออก` แบบ shadcn dropdown:
  - `ส่งออก CSV`
  - `ส่งออก PDF`
- CSV export:
  - ใช้ข้อมูล report summary ปัจจุบัน
  - ใส่ UTF-8 BOM เพื่อให้ Excel เปิดภาษาไทยได้ดีขึ้น
- PDF export:
  - เพิ่ม dependency `html2canvas` และ `jspdf`
  - ไม่ capture หน้า admin shell โดยตรง เพราะเสี่ยง CSS/chart ทำให้ export พัง
  - สร้าง PDF snapshot แบบ inline style สีพื้นฐานก่อน capture
  - แก้ pagination ไม่ให้ตัดกลางตาราง โดยแบ่ง PDF เป็นหลายหน้า:
    - หน้า 1: สรุป + แนวโน้ม
    - หน้า 2: สถานะ + หมวดเหตุ
    - หน้าถัดไป: พื้นที่ แบ่งแถวเป็น chunk
- เพิ่ม error logging สำหรับ PDF export:
  - `console.error("Report PDF export failed", error)`
- เพิ่ม/ปรับ regression tests ใน `lib/reports-page-wiring.test.mjs`
- ตั้ง `pnpm-workspace.yaml` ให้ `core-js: false` ใน `allowBuilds` เพื่อลด warning จาก pnpm หลังเพิ่ม dependency
- Rebuild และ recreate Docker `web` แล้ว

## Verification ล่าสุด

```powershell
rtk proxy node --test lib/reports-page-wiring.test.mjs
rtk proxy node --test lib/reports-page-wiring.test.mjs lib/settings-page-wiring.test.mjs lib/gis-page-wiring.test.mjs lib/contacts-location-select-wiring.test.mjs
rtk proxy pnpm build
rtk proxy docker compose -f docker-compose.yml -f docker-compose.local.yml build web
rtk proxy docker compose -f docker-compose.yml -f docker-compose.local.yml up -d web
rtk proxy powershell -NoProfile -Command "(Invoke-WebRequest -UseBasicParsing http://localhost:3000/admin/reports).StatusCode"
```

ผลที่ได้:
- Reports wiring tests ผ่าน 7/7
- Wiring tests รวมผ่าน 15/15
- Next build ผ่าน
- Docker `web` rebuild/recreate แล้ว
- `/admin/reports` ตอบ `200`

## Changed Files In Current Publish

- `app/admin/(dashboard)/reports/page.tsx`
- `lib/reports-page-wiring.test.mjs`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `CODEX_HANDOFF.md`

## Exact Next Task

หลัง publish รอบนี้ แนะนำให้เปรมเปิดหน้า `http://localhost:3000/admin/reports` แล้วตรวจแบบ manual:

1. กด `ส่งออก > ส่งออก CSV`
   - ได้ไฟล์ `.csv`
   - เปิดแล้วภาษาไทยอ่านได้
2. กด `ส่งออก > ส่งออก PDF`
   - ได้ไฟล์ `.pdf`
   - ตารางไม่ถูกตัดกลางหน้า
   - หน้า PDF อ่านง่ายพอสำหรับ demo
3. ถ้า PDF ยังยาว/แน่นเกินไป ให้ปรับ layout PDF snapshot ต่อ:
   - ลดจำนวนแถวต่อหน้า
   - เพิ่มหัวตารางซ้ำทุกหน้า
   - เพิ่มเลขหน้า

## Pending Work

- Reports PDF ยังเป็น snapshot/image-based ไม่ใช่ PDF text selectable
- ยังไม่มี export Excel จริง แค่ CSV
- Settings organization/timezone ยังไม่ได้ผูก DB เพราะต้องออกแบบ migration/API เพิ่ม
- Auto dispatch และ escalation ยังเป็น read-only note ยังไม่เปิดใช้จริง
- GIS เป็น read-only viewer; backend ยังมี `POST/PUT/DELETE /api/areas` legacy อยู่ แต่ UI ไม่ใช้แล้ว
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

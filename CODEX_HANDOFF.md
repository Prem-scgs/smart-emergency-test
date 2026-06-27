# Codex Handoff

อัปเดตล่าสุด: 2026-06-28

## Project State

- Repository: `https://github.com/SCGS7788/smart-emergency.git`
- Workspace: `D:\testwork_Fullstack(SCSG)\smart-emergency`
- Branch: `Prem(scgs)-emergencyV0` (ห้ามแตะ `main`)
- Latest committed baseline before this handoff: `2e0daca feat: เพิ่มระบบแปลภาษาในหน้า Settings`
- Current objective: ทำ Admin i18n ให้แยกชัดเจน ไทยคือไทย อังกฤษคืออังกฤษ โดยเริ่มจาก Dashboard และ child components
- Current checkpoint to commit: Dashboard i18n + localized incident location display

## Completed This Session

- ปรับ Dashboard ให้ใช้ `useAdminI18n()` และ dictionary กลางมากขึ้น
- ปรับหมวดเหตุให้เลือก label ตามภาษา:
  - Thai mode: `ดับเพลิง`, `น้ำท่วม`, `แพทย์`, `ตำรวจ`, `กู้ภัย`, `อุบัติเหตุทางถนน`
  - English mode: ใช้ label อังกฤษจาก reference category
- แก้ชื่อพื้นที่/จังหวัด/อำเภอที่เคยปนอังกฤษ เช่น `Mueang Phitsanulok`
  - ใช้ `provinceCode/districtCode` ไป lookup master location
  - Thai mode แสดง `เมืองพิษณุโลก พิษณุโลก`
  - English mode ใช้ชื่ออังกฤษจาก master location
- ปรับจุดแสดงผล Dashboard ที่เกี่ยวข้อง:
  - `app/admin/(dashboard)/dashboard/page.tsx`
  - `components/admin/incident-map.tsx`
  - `components/admin/incident-queue.tsx`
  - `components/admin/incident-detail-panel.tsx`
  - `components/admin/incident-status-timeline.tsx`
- ปรับ `getLocationDisplayName(item, preferThai)` ให้เลือกภาษาได้
- เพิ่ม `descriptionEn` ให้ workflow status meta
- เพิ่ม regression tests:
  - `lib/dashboard-i18n-wiring.test.mjs`
  - `lib/dashboard-child-i18n-wiring.test.mjs`
- Rebuild/restart Docker `web` แล้ว

## Verification ล่าสุด

รันแล้วผ่าน:

```powershell
rtk proxy powershell -NoProfile -Command "pnpm exec node --test lib/dashboard-i18n-wiring.test.mjs lib/dashboard-child-i18n-wiring.test.mjs lib/admin-i18n-wiring.test.mjs lib/settings-page-wiring.test.mjs"
rtk proxy powershell -NoProfile -Command "pnpm build"
rtk proxy docker compose --project-directory "D:\testwork_Fullstack(SCSG)\smart-emergency" -f "D:\testwork_Fullstack(SCSG)\smart-emergency\docker-compose.yml" -f "D:\testwork_Fullstack(SCSG)\smart-emergency\docker-compose.local.yml" build web
rtk proxy docker compose --project-directory "D:\testwork_Fullstack(SCSG)\smart-emergency" -f "D:\testwork_Fullstack(SCSG)\smart-emergency\docker-compose.yml" -f "D:\testwork_Fullstack(SCSG)\smart-emergency\docker-compose.local.yml" up -d web
```

ผล:

- i18n regression tests ผ่าน `14/14`
- `pnpm build` ผ่าน
- Docker `web` rebuild/restart ผ่าน
- HTTP check `http://localhost:3000/admin/dashboard` ได้ `200`
- Headless Chrome mock login ตรวจ Thai dashboard:
  - ไม่พบ `Mueang Phitsanulok`
  - ไม่พบ `Phitsanulok`
  - พบ `เมืองพิษณุโลก`
  - พบ `ตรวจสอบเรียลไทม์`
  - ไม่พบ `super_admin`
  - พบ `ผู้ดูแลระบบสูงสุด`

## Changed / Relevant Files

- `app/admin/(dashboard)/dashboard/page.tsx`
- `components/admin/incident-detail-panel.tsx`
- `components/admin/incident-map.tsx`
- `components/admin/incident-queue.tsx`
- `components/admin/incident-status-timeline.tsx`
- `lib/admin-i18n.tsx`
- `lib/emergency-category-utils.ts`
- `lib/incident-tracking.ts`
- `lib/reference-locations.ts`
- `lib/dashboard-i18n-wiring.test.mjs`
- `lib/dashboard-child-i18n-wiring.test.mjs`
- `CODEX_HANDOFF.md`

## Exact Next Task

หลัง push checkpoint นี้แล้ว งานต่อที่เหมาะสุด:

1. Manual check หน้า `http://localhost:3000/admin/dashboard` ใน browser ของเปรม:
   - Thai mode ต้องไม่ปน label อังกฤษในข้อมูล Dashboard หลัก
   - English mode ต้องเปลี่ยน label UI/category/status/location เป็นอังกฤษ
   - หมายเหตุ: ตัวอักษรบนแผนที่ OpenStreetMap เป็น tile ภายนอก ไม่ได้ถูกควบคุมด้วย i18n ของระบบ
2. ถ้าผ่าน ค่อยทำ i18n หน้า Admin อื่นทีละหน้า:
   - Contacts
   - GIS
   - Reports
   - Call logs
   - Users

## Pending Work

- ยังไม่ได้แปลครบทุกหน้า Admin ทั้งระบบ
- Users page ยังมี mock/legacy UI บางส่วน
- Settings เฟส 2 ยังเหลือ polish ช่องทางศูนย์ LINE/SMS/WhatsApp
- Settings เฟส 3 ยังเหลือ polish สถานะระบบ API/Database/SSE
- Production readiness/FSD structure migration ยังรอหลัง flow หลักนิ่ง

## Decisions

- Admin i18n ใช้ local browser preference ก่อน จนกว่าทีม Auth จะมี user preference จริง
- Dashboard location display ต้องยึด master location จาก `provinceCode/districtCode` ไม่ใช้ raw incident text เป็นหลัก
- Realtime ใช้ SSE เท่านั้น ห้ามเพิ่ม WebSocket โดยไม่ถาม
- Docker local full stack ใช้งานอยู่ เปลี่ยน frontend แล้วต้อง rebuild/restart `web`

## Safety Rules

- เรียกผู้ใช้ว่า “เปรม” และตอบ/ถามเป็นภาษาไทย
- อ่าน/เขียนไทยด้วย UTF-8
- prefix shell commands ด้วย `rtk`
- ห้ามแตะ `main`
- ห้าม reset/checkout/revert งานผู้ใช้โดยไม่ขอ
- ห้าม commit/push จนกว่าเปรมยืนยัน
- ก่อน commit/push ต้องเช็คไฟล์ที่จะขึ้น git ทุกครั้ง
- ห้ามเปิดเผย `.env`, token, phone จริง, session ID หรือพิกัดผู้ใช้

## Suggested Skills

- `$token-lean-workflow` เพื่อลด token และอ่านเฉพาะไฟล์เกี่ยวข้อง
- `$debug-mantra` เมื่อเจอบั๊ก UI/runtime
- `$test-driven-development` ก่อนแก้ behavior
- `$verification-before-completion` ก่อนสรุปว่าเสร็จหรือก่อน commit/push
- `$handoff` เมื่อ compact หรือสลับบัญชี

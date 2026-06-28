# Codex Handoff

อัปเดตล่าสุด: 2026-06-28

## Project State

- Repository: `https://github.com/SCGS7788/smart-emergency.git`
- Workspace: `D:\testwork_Fullstack(SCSG)\smart-emergency`
- Branch: `Prem(scgs)-emergencyV0` (ห้ามแตะ `main`)
- Latest committed baseline before this handoff: `431cfb1 feat: แยกภาษา Dashboard ไทยอังกฤษให้ชัดเจน`
- Current objective: ทำ Admin i18n ให้แยกชัดเจน ไทยคือไทย อังกฤษคืออังกฤษ ทีละหน้า
- Current checkpoint to commit: Contacts i18n + localized location/category labels

## Completed This Session

- ปรับหน้า `Contacts` ให้ใช้ `useAdminI18n()`
- เพิ่ม dictionary keys สำหรับ Contacts ทั้ง Thai/English ใน `lib/admin-i18n.tsx`
- ปรับ Contacts labels ให้เปลี่ยนตามภาษา:
  - page title/description
  - scope badge
  - reload/add buttons
  - KPI cards
  - search/filter
  - table headers
  - active/inactive/24h badges
  - create/edit dialog
  - coverage selector
  - province/district selector
  - delete confirmation
  - toast/error messages
- ปรับ category label ให้ใช้ `buildAdminCategoryCollections(referenceCategories, preferThai)`
- ปรับ province/district display ให้ใช้ `getLocationDisplayName(item, preferThai)`
- เพิ่ม lookup จาก `useLocationLookupMaps()` เพื่อแสดงพื้นที่ของ contact จาก `provinceCode/districtCode`
- เพิ่ม regression test:
  - `lib/contacts-i18n-wiring.test.mjs`
- Rebuild/restart Docker `web` แล้ว

## Verification ล่าสุด

รันแล้วผ่าน:

```powershell
rtk proxy powershell -NoProfile -Command "pnpm exec node --test lib/contacts-i18n-wiring.test.mjs lib/dashboard-i18n-wiring.test.mjs lib/dashboard-child-i18n-wiring.test.mjs lib/admin-i18n-wiring.test.mjs lib/settings-page-wiring.test.mjs"
rtk proxy powershell -NoProfile -Command "pnpm build"
rtk proxy docker compose --project-directory "D:\testwork_Fullstack(SCSG)\smart-emergency" -f "D:\testwork_Fullstack(SCSG)\smart-emergency\docker-compose.yml" -f "D:\testwork_Fullstack(SCSG)\smart-emergency\docker-compose.local.yml" build web
rtk proxy docker compose --project-directory "D:\testwork_Fullstack(SCSG)\smart-emergency" -f "D:\testwork_Fullstack(SCSG)\smart-emergency\docker-compose.yml" -f "D:\testwork_Fullstack(SCSG)\smart-emergency\docker-compose.local.yml" up -d web
```

ผล:

- i18n regression tests ผ่าน `16/16`
- `pnpm build` ผ่าน
- Docker `web` rebuild/restart ผ่าน
- HTTP check `http://localhost:3000/admin/contacts` ได้ `200`
- Headless Chrome mock login ตรวจ Contacts:
  - Thai mode เห็น `จัดการเบอร์ฉุกเฉิน`
  - English mode เห็น `Emergency contacts`
  - category/coverage/table labels เปลี่ยนตามภาษา

## Changed / Relevant Files

- `app/admin/(dashboard)/contacts/page.tsx`
- `lib/admin-i18n.tsx`
- `lib/contacts-i18n-wiring.test.mjs`
- `CODEX_HANDOFF.md`

## Important Caveat

- ชื่อหน่วยงานในตาราง Contacts เช่น `Emergency Medical Services` เป็นข้อมูลจริงจาก DB field `contacts.name`
- ตอนนี้ schema ยังไม่มี `name_th/name_en`
- ดังนั้น UI labels แปลครบแล้ว แต่ชื่อหน่วยงานที่เป็น data จะยังแสดงตามที่ DB เก็บไว้
- ถ้าต้องการแยกไทย/อังกฤษสำหรับชื่อหน่วยงานจริง ต้องทำงาน DB/schema เพิ่มในรอบถัดไป

## Exact Next Task

หลัง push checkpoint นี้แล้ว งานต่อที่แนะนำคือหน้า `GIS`:

Acceptance criteria:

1. หน้า GIS ใช้ `useAdminI18n()`
2. Label UI แยก Thai/English ชัดเจน
3. จังหวัด/อำเภอใช้ `getLocationDisplayName(item, preferThai)`
4. Search/filter/list/map popup ไม่ปนภาษา UI
5. ระวัง map tile จาก OpenStreetMap ไม่อยู่ใน scope i18n ของระบบ
6. เพิ่ม regression test สำหรับ GIS i18n wiring
7. รัน tests + `pnpm build`
8. ถ้าใช้ Docker ให้ rebuild/restart `web`

## Pending Work

- ยังไม่ได้ทำ i18n/polish หน้า:
  - GIS
  - Reports
  - Call logs
  - Users
- Users page ยังเป็น mock/legacy เยอะสุด อาจรอทีม Auth
- Settings เฟส 2 ยังเหลือ polish ช่องทางศูนย์ LINE/SMS/WhatsApp
- Settings เฟส 3 ยังเหลือ polish สถานะระบบ API/Database/SSE
- Production readiness/FSD structure migration ยังรอหลัง flow หลักนิ่ง

## Decisions

- Admin i18n ใช้ local browser preference ก่อน จนกว่าทีม Auth จะมี user preference จริง
- Dashboard/Contacts location display ต้องยึด master location จาก `provinceCode/districtCode` เมื่อมี code
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

# Codex Handoff

อัปเดตล่าสุด: 2026-06-28

## Project State

- Repository: `https://github.com/SCGS7788/smart-emergency.git`
- Workspace: `D:\testwork_Fullstack(SCSG)\smart-emergency`
- Branch: `Prem(scgs)-emergencyV0` (ห้ามแตะ `main`)
- Latest commit: `7e61043 feat: ปรับเสียงแจ้งเตือนในหน้า Settings`
- Current objective: วางระบบแปลภาษา Admin แบบกลาง และทำให้หน้า Settings เปลี่ยนภาษาแบบ preview ทันทีแต่ยังไม่บันทึกจนกด `บันทึก`
- Working tree: มี uncommitted changes 6 รายการ

## Completed This Session

- เพิ่มระบบ i18n กลางของ Admin:
  - `lib/admin-i18n.tsx`
  - `AdminI18nProvider`
  - `useAdminI18n()`
  - dictionary `th/en`
  - event `smart-emergency:admin-language-change`
- ครอบ Admin tree ด้วย `AdminI18nProvider` ใน `app/admin/layout.tsx`
- ปรับ Admin shell/sidebar/topbar ใน `components/admin/admin-layout-client.tsx` ให้ใช้ `t(...)` แทน label hardcoded
- ปรับหน้า Settings ให้ใช้ `useAdminI18n()` สำหรับข้อความหลัก
- ปรับ dropdown ภาษา:
  - เลือกภาษาแล้ว UI เปลี่ยนทันที
  - ยังไม่เขียน localStorage จนกด `บันทึก`
  - ถ้า refresh ก่อนกดบันทึก จะกลับไปภาษาที่บันทึกไว้ล่าสุด
- เพิ่ม/ปรับ regression tests:
  - `lib/admin-i18n-wiring.test.mjs`
  - `lib/settings-page-wiring.test.mjs`

## Current Uncommitted Changes

- `app/admin/(dashboard)/settings/page.tsx`
  - ใช้ i18n จาก `useAdminI18n()`
  - เพิ่ม `previewSettingsLanguage()` เพื่อ preview ภาษาโดยไม่ persist
  - save เท่านั้นถึงบันทึก preference ลง `admin_settings_preferences`
- `app/admin/layout.tsx`
  - เพิ่ม `AdminI18nProvider`
- `components/admin/admin-layout-client.tsx`
  - ใช้ key + `t(...)` สำหรับเมนูและ shell labels
- `lib/admin-i18n.tsx`
  - ไฟล์ใหม่สำหรับ admin i18n provider/dictionaries
- `lib/admin-i18n-wiring.test.mjs`
  - ไฟล์ใหม่ guard wiring i18n
- `lib/settings-page-wiring.test.mjs`
  - เพิ่ม guard language preview/save behavior

## Verification ล่าสุด

รันแล้วผ่าน:

```powershell
rtk proxy pnpm --dir "D:\testwork_Fullstack(SCSG)\smart-emergency" exec node --test lib/settings-page-wiring.test.mjs
rtk proxy pnpm --dir "D:\testwork_Fullstack(SCSG)\smart-emergency" exec node --test lib/admin-i18n-wiring.test.mjs
rtk proxy pnpm --dir "D:\testwork_Fullstack(SCSG)\smart-emergency" build
rtk proxy docker compose --project-directory "D:\testwork_Fullstack(SCSG)\smart-emergency" -f "D:\testwork_Fullstack(SCSG)\smart-emergency\docker-compose.yml" -f "D:\testwork_Fullstack(SCSG)\smart-emergency\docker-compose.local.yml" build web
rtk proxy docker compose --project-directory "D:\testwork_Fullstack(SCSG)\smart-emergency" -f "D:\testwork_Fullstack(SCSG)\smart-emergency\docker-compose.yml" -f "D:\testwork_Fullstack(SCSG)\smart-emergency\docker-compose.local.yml" up -d web
```

ผล:

- `settings-page-wiring.test.mjs` ผ่าน `7/7`
- `admin-i18n-wiring.test.mjs` ผ่าน `3/3`
- `pnpm build` ผ่าน
- Docker `web` rebuild/restart แล้ว

## Exact Next Task

ให้เปรม manual test ที่ `http://localhost:3000/admin/settings`:

1. เปลี่ยนภาษาเป็น English แล้วหน้า Settings + Admin shell ต้องเปลี่ยนทันที
2. ยังไม่กด `Save` แล้ว refresh หน้า ต้องกลับไปภาษาเดิมที่เคยบันทึกไว้
3. เปลี่ยนภาษาอีกครั้งแล้วกด `Save`
4. refresh แล้วภาษาต้องคงเป็นค่าที่บันทึกล่าสุด

ถ้าผ่าน:

- ถามเปรมก่อน commit/push
- Commit message แนะนำ: `feat: เพิ่มระบบแปลภาษาในหน้า Settings`
- ก่อน commit ต้องรัน:
  - `rtk proxy git -C "D:\testwork_Fullstack(SCSG)\smart-emergency" status --short`
  - `rtk proxy git -C "D:\testwork_Fullstack(SCSG)\smart-emergency" diff --name-status`

## Pending Work

- ยังไม่ได้แปลครบทุกหน้า Admin:
  - Dashboard
  - Contacts
  - GIS
  - Reports
  - Call logs
  - Users
- แนะนำทำทีละหน้าเพื่อคุม token และลดโอกาส layout พัง
- Settings เฟส 2 ยังเหลือ polish ช่องทางศูนย์ LINE/SMS/WhatsApp
- Settings เฟส 3 ยังเหลือ polish สถานะระบบ API/Database/SSE
- Production readiness/FSD structure migration ยังรอหลัง flow หลักนิ่ง

## Decisions

- ระบบ Admin i18n ใช้ local browser preference ก่อน จนกว่าทีม Auth จะมี user preference จริง
- การเปลี่ยนภาษาใน Settings ต้อง preview ทันที แต่ persist เฉพาะเมื่อกด `บันทึก`
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
- `$brainstorming` ก่อนปรับ UI/flow ใหม่
- `$test-driven-development` ก่อนแก้ behavior
- `$verification-before-completion` ก่อนสรุปว่าเสร็จหรือก่อน commit/push
- `$handoff` เมื่อ compact หรือสลับบัญชี

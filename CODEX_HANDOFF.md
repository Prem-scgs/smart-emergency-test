# Codex Handoff

อัปเดตล่าสุด: 2026-06-27

## Project State

- Repository: `https://github.com/SCGS7788/smart-emergency.git`
- Workspace: `D:\testwork_Fullstack(SCSG)\smart-emergency`
- Branch: `Prem(scgs)-emergencyV0` (ห้ามแตะ `main`)
- Latest pushed commit: `af826b3 feat: เพิ่มปุ่มพิมพ์รายงาน`
- Current focus: หน้า Settings เฟสตั้งค่าส่วนตัวของ Admin โดยเฉพาะเสียง Alert และ reduced motion
- Working tree: มี uncommitted changes 4 ไฟล์

## Completed Recently

- Reports:
  - เพิ่มปุ่ม `พิมพ์รายงาน`
  - commit/push แล้วที่ `af826b3 feat: เพิ่มปุ่มพิมพ์รายงาน`
- Settings personal preferences:
  - เพิ่ม CSS `.reduce-motion` ให้ toggle `ลดแอนิเมชัน` มีผลจริงกับ animation, transition และ smooth scroll
  - ตัด preview motion ออกแล้ว เพราะเปรมมองว่าไม่ช่วย
  - ปรับแนวคิดเสียง Alert ให้เป็น “ความชอบของแอดมิน” ไม่ผูกกับ severity ของ incident
  - เปลี่ยน label เสียงใน Settings เป็นภาษาไทย:
    - `เบา`
    - `ชัด`
    - `เร่งจังหวะ`
  - เพิ่มคำอธิบาย: `เลือกเสียงที่คุณได้ยินชัดที่สุดเมื่อมีเคสใหม่เข้าระบบ`
  - ปรับ pattern เสียงให้ต่างกันชัดขึ้น:
    - `soft-chime`: chime นุ่มกว่า
    - `alert-beep`: beep สองจังหวะ
    - `siren-pulse`: สูง/ต่ำถี่กว่า
  - แก้ `components/admin/alert-display.tsx` ให้เล่นเสียงจาก `preferences.tone` เท่านั้น ไม่ใช้ `currentAlert.severity` เลือก pattern แล้ว
  - ย้ายปุ่ม `ทดสอบเสียง` มาอยู่ใต้ dropdown เลือกเสียง ตามที่เปรมขอ

## Current Uncommitted Changes

ไฟล์ที่เปลี่ยนและยังไม่ได้ commit/push:

- `app/admin/(dashboard)/settings/page.tsx`
  - เปลี่ยน label เสียงเป็นไทย
  - เพิ่มคำอธิบายเสียง Alert
  - ย้ายปุ่ม `ทดสอบเสียง` มาอยู่ใต้ dropdown
  - ปรับ test tone pattern ให้ต่างกันชัดขึ้น
- `components/admin/alert-display.tsx`
  - ตัดการเลือกเสียงตาม severity
  - `playAlertTone()` รับเฉพาะ `AlertTonePreset`
  - alert popup ใช้เสียงตาม preference ของ admin เท่านั้น
- `app/globals.css`
  - เพิ่ม `.reduce-motion` ลด animation/transition/scroll จริง
- `lib/settings-page-wiring.test.mjs`
  - เพิ่ม guard สำหรับ label ไทย
  - เพิ่ม guard ว่าเสียงไม่ผูกกับ severity
  - เพิ่ม guard reduced motion CSS
  - เพิ่ม guard layout ปุ่มทดสอบเสียงใต้ dropdown

## Verification ล่าสุด

รันแล้วผ่าน:

```powershell
rtk proxy node --test lib/settings-page-wiring.test.mjs
rtk proxy node --test lib/admin-sse-wiring.test.ts
rtk proxy pnpm build
rtk proxy docker compose -f docker-compose.yml -f docker-compose.local.yml build web
rtk proxy docker compose -f docker-compose.yml -f docker-compose.local.yml up -d web
rtk proxy powershell -NoProfile -Command "(Invoke-WebRequest -UseBasicParsing 'http://localhost:3000/admin/settings').StatusCode"
```

ผลล่าสุด:

- `settings-page-wiring.test.mjs` ผ่าน `6/6`
- `admin-sse-wiring.test.ts` ผ่าน `8/8`
- `pnpm build` ผ่าน
- Docker `web` rebuild/restart แล้ว
- `/admin/settings` ตอบ `200`

## Exact Next Task

ให้เปรมเปิด `http://localhost:3000/admin/settings` แล้วตรวจ manual:

1. Dropdown เสียงต้องแสดงชื่อไทย:
   - `เบา`
   - `ชัด`
   - `เร่งจังหวะ`
2. ปุ่ม `ทดสอบเสียง` ต้องอยู่ใต้ dropdown ไม่อยู่ขวาสุด
3. กดทดสอบทั้ง 3 เสียงแล้วต้องรู้สึกต่างกันชัดขึ้น
4. สร้าง incident ใหม่หรือ trigger alert แล้ว popup alert ต้องเล่นเสียงตาม preference ที่ admin เลือก ไม่ใช่ตาม severity

ถ้าเปรมยืนยันว่าโอเค:

- แนะนำ commit:
  - `feat: ปรับเสียงแจ้งเตือนในหน้า Settings`
- ก่อน commit ต้องเช็คไฟล์ด้วย:
  - `rtk proxy git status -sb`
  - `rtk proxy git diff --name-status`
- Stage เฉพาะ 4 ไฟล์ด้านบน เว้นแต่เปรมสั่งรวม `CODEX_HANDOFF.md` ด้วย

## Pending Work

- Settings เฟส 2:
  - polish ส่วน `ช่องทางศูนย์` LINE / SMS / WhatsApp
  - แสดงว่าเป็นช่องทางให้ประชาชนแชร์ location กลับศูนย์ ไม่ใช่ระบบส่ง notification หา admin
  - เฉพาะ `super_admin` เห็น
  - ห้ามแสดง secret หรือค่า `.env` เต็ม
- Settings เฟส 3:
  - polish สถานะระบบ API / Database / SSE แบบ read-only สำหรับ `super_admin`
- Reports:
  - CSV/PDF/Print ผ่านและ pushed แล้ว
  - PDF ยังเป็น image snapshot ไม่ใช่ selectable text
- GIS:
  - ผ่านแล้วตามเปรม
- Contacts:
  - role flow ผ่านแล้วตามเปรม
- Production readiness:
  - Docker local full stack มีแล้ว
  - HTTPS/iPhone GPS ยังเป็นงาน deploy/demo รอบถัดไป
  - FSD/feature-sliced structure migration รอหลัง flow หลักนิ่ง

## Decisions

- เสียง Alert เป็น preference ของแอดมิน ไม่ใช่ระดับความรุนแรงของเคส
- ทุก incident.created ใช้เสียงที่ admin เลือกเหมือนกัน
- Severity ยังใช้สำหรับสี, badge, filter, จัดลำดับ, dashboard summary ได้ แต่ไม่ใช้เลือกเสียงตอน alert เข้า
- Realtime ใช้ SSE เท่านั้น ห้ามเพิ่ม WebSocket โดยไม่ปรึกษา
- ไม่เพิ่มไฟล์เสียงจริงตอนนี้ ใช้ Web Audio API ต่อไปก่อน

## Safety Rules

- เรียกผู้ใช้ว่า “เปรม” และถามเป็นภาษาไทย
- อ่าน/เขียนไทยด้วย UTF-8
- prefix shell commands ด้วย `rtk`
- ห้ามแตะ `main`
- ห้าม reset/checkout/revert งานผู้ใช้โดยไม่ขอ
- ห้าม commit/push จนกว่าเปรมยืนยัน
- ก่อน commit/push ต้องเช็คไฟล์ที่จะขึ้น git ทุกครั้ง
- ห้ามเปิดเผย `.env`, token, phone จริง, session ID หรือพิกัดผู้ใช้

## Suggested Skills

- `$brainstorming` ก่อนปรับ UI/flow เพิ่ม
- `$test-driven-development` ก่อนแก้ behavior
- `$verification-before-completion` ก่อนสรุปว่าเสร็จหรือก่อน commit/push
- `$handoff` เมื่อ compact หรือสลับบัญชี

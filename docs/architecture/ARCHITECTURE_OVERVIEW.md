# Architecture Overview

เอกสารนี้เป็นภาพรวมระบบสำหรับคนใหม่ อ่านไฟล์นี้ก่อนลงรายละเอียด จะช่วยให้เห็นว่า frontend, backend, database, realtime และ GIS ต่อกันยังไง

## System Boundary

Smart Emergency แบ่ง runtime หลักเป็น 3 ส่วน:

- Frontend: Next.js ใน `app/`, `widgets/`, `features/`, `entities`, `shared`
- Backend: Fastify service ใน `services/emergency-api`
- Database: PostgreSQL/PostGIS ผ่าน Docker compose

Vercel test ใช้ frontend บน Vercel แต่ API/DB ยังอยู่บนเครื่องเปรมผ่าน Cloudflare tunnel/custom domain เช่น `https://emer-api.scgs-ai.com`

## Frontend Flow

Mobile user เข้า `/` แล้ว `widgets/mobile-emergency` จะดูแล flow หลัก:

1. โหลด location/contact/reference data
2. เลือกหมวดเหตุและ contact ที่เหมาะกับพื้นที่
3. สร้าง incident ผ่าน `POST /api/incidents`
4. เปิด native `tel:` เพื่อโทร
5. เข้า tracking/history และ location sharing

Admin เข้า `/admin` แล้ว flow หลักอยู่ที่:

- `widgets/admin-login`: mock/demo login role
- `widgets/admin-shell`: admin layout, navigation, notification center
- `widgets/dashboard-map`: dashboard queue/map/detail/realtime view
- `widgets/admin-*`: pages เฉพาะงาน เช่น contacts, GIS, reports, call logs, settings

Route files ใน `app/` ควรเป็น shell เท่านั้น ถ้าเห็น business state/fetch/export logic ใน route แปลว่าควรพิจารณาย้ายเข้า widget

## Backend Flow

`services/emergency-api` เป็น Fastify service ที่ถือ API และเชื่อม DB โดยตรง

Module หลัก:

- `modules/incidents`: create incident, tracking, status update, map-points, recent polling, SSE events, reports
- `modules/contacts`: emergency contact CRUD และ role scope
- `modules/areas`: GIS boundaries, resolve point, area contacts/incidents
- `modules/reference`: category/province/district/share-channel reference data
- `modules/admin`: organization settings และ share channel admin settings

ถ้าแก้ backend endpoint ต้องทดสอบทั้ง route tests และ frontend wiring ที่เรียก endpoint นั้น

## Database Flow

ตารางสำคัญ:

- `incidents`: incident หลัก ใช้ UUID เป็น internal id และ `case_number` เป็น user-facing id
- `incident_status_history`: timeline การเปลี่ยนสถานะ
- `incident_location_history`: location history ของเคส
- `incident_case_counters`: counter ต่อ category/date สำหรับสร้าง case number
- `contacts`: emergency contacts ที่ mobile/admin ใช้
- `areas`: province/district/area geometry และ metadata
- `emergency_categories`: category master data
- `center_share_channels`: LINE/SMS/WhatsApp recipient settings
- `system_settings`: organization/system settings
- `audit_logs`: log การกระทำสำคัญ

Migration ใช้ `pnpm db:migrate` เป็น source of truth สำหรับ local dev ห้ามลบ migration เก่าโดยไม่ตรวจ DB impact

## Realtime Flow

Realtime ใช้ SSE เป็นหลัก:

- Admin stream: `GET /api/events?role=<role>&category=<category>`
- Mobile case stream: `GET /api/incidents/:id/events?sessionId=<sessionId>`

Dashboard ยัง polling `GET /api/incidents/recent?since=<cursor>&limit=50` เป็น fallback เพราะ tunnel/browser บางกรณีเปิด SSE ได้แต่ event ไม่ถึง UI

ถ้าแก้ realtime ต้องทดสอบ:

- admin alert ไม่ซ้ำ
- viewer passive ไม่มี popup/sound/actionable notification
- status update ส่งถึง dashboard/mobile tracking
- polling fallback ยังไม่สร้าง duplicate

## Auth / Authorization

Auth ตอนนี้เป็น demo boundary:

- Frontend เก็บ admin user ใน localStorage
- Frontend ส่ง `x-admin-role` และ `x-admin-category`
- Backend ใช้ header/query scope เพื่อกรองข้อมูล demo

Roles ปัจจุบัน:

- `super_admin`: เห็น/จัดการทุก category
- `agency_admin`: เห็น/จัดการเฉพาะ category ตัวเอง
- `viewer`: read-only/passive ตาม category

ยังไม่พบข้อมูล real team auth/JWT contract ใน Repository ดังนั้นอย่าสร้าง security-sensitive feature ที่พึ่ง demo header นี้เป็น production auth

## GIS / Location

GIS ใช้ PostGIS และ `areas` table:

- mobile/admin ส่ง latitude/longitude
- backend resolve province/district/area ด้วย PostGIS เมื่อทำได้
- frontend map ใช้ GeoJSON `[lng, lat]`
- DB/application หลายจุดยังเรียก field เป็น `latitude`/`longitude`

ถ้าแก้ GIS ต้องระวัง coordinate order และต้องทดสอบ `resolve-point`, dashboard map fit bounds, GIS boundary map และ contact/incident marker

## Where To Read Next

- Setup/debug: [RUNBOOK.md](../operations/RUNBOOK.md)
- Env/deploy: [ENVIRONMENT.md](../operations/ENVIRONMENT.md)
- API details: [API_CONTRACT.md](../api/API_CONTRACT.md)
- FSD owner: [FSD_LITE_GUIDE.md](FSD_LITE_GUIDE.md)
- Code/comment rules: [CODE_CONVENTIONS_TH.md](CODE_CONVENTIONS_TH.md)

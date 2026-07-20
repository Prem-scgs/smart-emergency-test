# Runbook

คู่มือนี้ใช้ตรวจ runtime ของ Smart Emergency ในสภาพ cloud-first ปัจจุบัน: frontend อยู่บน Vercel ส่วน Fastify API และ PostgreSQL/PostGIS ยังอยู่บนเครื่อง host ของทีมผ่าน Cloudflare custom domain

อ่านภาพรวมก่อนเริ่มงานที่ [ARCHITECTURE_OVERVIEW.md](../architecture/ARCHITECTURE_OVERVIEW.md) และดูรายละเอียดตัวแปรที่ [ENVIRONMENT.md](ENVIRONMENT.md)

## 1. Runtime ปัจจุบัน

```text
Browser -> Vercel frontend -> /emergency-api rewrite -> emer-api.scgs-ai.com -> Cloudflare tunnel -> Fastify API -> PostgreSQL/PostGIS
Browser -> EventSource -> emer-api.scgs-ai.com/api/events -> Cloudflare tunnel -> Fastify SSE
```

- Frontend test: `https://smart-emergency-test.vercel.app`
- API domain: `https://emer-api.scgs-ai.com`
- API health: `https://emer-api.scgs-ai.com/health`

REST และ polling ใช้ `/emergency-api/*` ผ่าน Next rewrite เพื่อลด CORS ส่วน SSE ใช้ API domain โดยตรง หาก API/DB/cloudflared ของเครื่อง host หยุด หน้า Vercel ยังโหลดได้ แต่ข้อมูลและ realtime จะใช้ไม่ได้

## 2. ตรวจระบบก่อน Smoke Test

```powershell
curl https://emer-api.scgs-ai.com/health
curl https://smart-emergency-test.vercel.app/emergency-api/health
```

เมื่อ health ไม่ผ่าน ให้ตรวจตามลำดับนี้:

1. Docker/API process บนเครื่อง host ยังรันอยู่หรือไม่
2. `http://localhost:4000/health` ตอบบนเครื่อง host หรือไม่
3. PostgreSQL/PostGIS พร้อมและ migrations ถูก apply หรือไม่
4. cloudflared connector ยัง online และ hostname ผูก named tunnel ถูกต้องหรือไม่
5. Vercel env `NEXT_PUBLIC_EMERGENCY_API_EXTERNAL_URL` และ `NEXT_PUBLIC_EMERGENCY_EVENTS_EXTERNAL_URL` ยังชี้ `https://emer-api.scgs-ai.com` หรือไม่

ถ้าเห็น Cloudflare Error 1033 ให้แก้ tunnel/host ก่อน เพราะ Cloudflare หา connector ไม่เจอ ไม่ใช่ปัญหาจาก route frontend

## 3. Rebuild API เมื่อ Source เปลี่ยน

การ restart container อย่างเดียวไม่ทำให้ source ที่อยู่ใน image เก่าเปลี่ยน ต้อง rebuild API แล้ว recreate container:

```powershell
docker compose -f docker-compose.yml -f docker-compose.local.yml build api
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d api
```

คำสั่งนี้ไม่ลบ DB volume หลังจากนั้นตรวจ health และ endpoint ที่เพิ่งแก้เสมอ

## 4. Flow สำคัญที่ต้องระวัง

### Mobile create -> admin alert

1. Mobile เรียก `POST /api/incidents` พร้อม `clientRequestId` เพื่อให้การสร้างเคส idempotent
2. API บันทึก incident, history, audit log แล้วส่ง `incident.created`
3. Admin รับข้อมูลผ่าน SSE และ polling fallback `/api/incidents/recent`
4. `super_admin` และ `agency_admin` เห็น alert ตาม scope; `viewer` เห็น data refresh แบบ passive เท่านั้น

UI ต้องแสดง `caseNumber` เป็นเลขเคส ส่วน UUID เป็น internal id สำหรับ API/tracking

### Admin status update

`PATCH /api/incidents/:id/status` ส่ง `fromStatus`, `toStatus`, `expectedVersion`, `note` เพื่อใช้ optimistic concurrency ถ้ามี admin คนอื่นอัปเดตก่อน API จะคืน `409`; detail panel ต้อง reload tracking และแจ้ง error เดิม

### GIS และ location

GIS ใช้ API/PostGIS ไม่ใช่ mock data: `/api/areas`, `/api/areas/resolve-point`, `/api/areas/:id/contacts`, `/api/areas/:id/incidents` และ `/api/incidents/map-points` เมื่อแก้ map/location ให้ทดสอบ selected-area bounds, popup, marker และ province/district display ตามภาษา

## 5. Role Boundary

auth ปัจจุบันเป็น demo/localStorage/header contract ไม่ใช่ production auth จริง:

- `super_admin`: อ่านและจัดการทุกหมวด
- `agency_admin`: อ่านและจัดการเฉพาะหมวดของ agency
- `viewer`: อ่าน scoped data ได้ แต่ไม่มี write action, popup, sound หรือ actionable notification

ห้ามสร้าง security-sensitive feature ใหม่โดยยึด header demo นี้เป็น auth จริงจนกว่าจะมี JWT/Auth contract ของทีม

## 6. Smoke Checklist

- Mobile/iPhone `Call` สร้าง incident ได้และแสดง `caseNumber`
- Admin ได้ alert เดียว, queue/map มีเคสเดียวกัน และ alert/queue/map เปิด detail เคสเดียวกัน
- Viewer เปิด detail scoped ได้แต่เปลี่ยนสถานะไม่ได้ และไม่มี popup/sound
- Contacts CRUD ตรงตาม role scope
- GIS โหลด boundary/contact/incident ได้
- Reports และ call logs export/print ได้
- Settings language/theme/sound/share channels ทำงาน

## 7. Local Fallback

Local/Docker เก็บไว้สำหรับ debug, migration และพัฒนา feature ไม่ใช่ runtime หลัก:

```powershell
pnpm install
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev:api
pnpm dev
```

ห้ามตั้ง `EMERGENCY_API_INTERNAL_URL` บน Vercel เป็น `localhost`, `127.0.0.1` หรือ `http://api:4000` เพราะ Vercel จะชี้กลับไปเครื่องของ Vercel เอง

## 8. Handoff

ก่อนจบ session ให้บันทึกสถานะใน `CODEX_HANDOFF.md` (ไฟล์ local/ignored ถ้าใช้งาน), อัปเดต [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) เมื่อสถานะ deploy/smoke เปลี่ยน และอัปเดต API/env/GIS docs ใน commit เดียวกันเมื่อ contract เปลี่ยน

# Smart Emergency

ระบบแจ้งเหตุฉุกเฉินที่ประกอบด้วย Mobile flow, Admin dashboard, GIS boundary lookup และ realtime incident alert ใช้ Next.js เป็น frontend, Fastify เป็น API และ PostgreSQL/PostGIS เป็นฐานข้อมูล

เอกสารนี้เป็นจุดเริ่มต้นสำหรับคนใหม่ ส่วนรายละเอียดให้เปิดอ่านตามงานที่กำลังทำ:

- ภาพรวมสถาปัตยกรรม: [ARCHITECTURE_OVERVIEW.md](docs/architecture/ARCHITECTURE_OVERVIEW.md)
- กฎการวางไฟล์ FSD-lite: [FSD_LITE_GUIDE.md](docs/architecture/FSD_LITE_GUIDE.md)
- วิธีรันและแก้ปัญหา: [RUNBOOK.md](docs/operations/RUNBOOK.md)
- ตัวแปร environment: [ENVIRONMENT.md](docs/operations/ENVIRONMENT.md)
- API contract ปัจจุบัน: [API_CONTRACT.md](docs/api/API_CONTRACT.md)

## โครงสร้างโปรเจกต์

- `app/`: Next.js route และ layout shell
- `widgets/`: หน้าและ section ระดับใหญ่ เช่น dashboard, GIS, contacts, reports, settings, login และ mobile flow
- `features/`: workflow เฉพาะเรื่อง เช่น incident alert, mobile incident, location sharing
- `entities/`: domain types และ helpers เช่น incident, contact, area, call
- `shared/`: auth, config, API helpers, i18n, reference data, realtime และ utilities
- `components/ui/`: UI primitives ที่ใช้ซ้ำ
- `lib/`: tests และ wiring checks เท่านั้น ห้ามเพิ่ม runtime implementation ใหม่
- `services/emergency-api/`: Fastify backend
- `services/emergency-api/db/`: migrations และ seed data

## เริ่มใช้งานแบบ Cloud-First

ทีมทดสอบ frontend บน Vercel และให้ API/DB รันจากเครื่องที่เป็น host ผ่าน Cloudflare custom domain:

- Frontend test: [https://smart-emergency-test.vercel.app](https://smart-emergency-test.vercel.app)
- API domain: [https://emer-api.scgs-ai.com](https://emer-api.scgs-ai.com)

ตั้งค่า Vercel Environment Variables สำหรับ deployment ที่ต้องทดสอบ:

```env
NEXT_PUBLIC_EMERGENCY_API_EXTERNAL_URL=https://emer-api.scgs-ai.com
NEXT_PUBLIC_EMERGENCY_EVENTS_EXTERNAL_URL=https://emer-api.scgs-ai.com
```

REST/polling จะผ่าน same-origin rewrite `/emergency-api/*` เพื่อลดปัญหา CORS ส่วน SSE ใช้ API domain โดยตรงผ่าน `EventSource` ดังนั้นเมื่อ API, DB หรือ cloudflared ของเครื่อง host หยุดทำงาน หน้า Vercel ยังเปิดได้แต่ข้อมูลสดจะใช้งานไม่ได้

ตรวจ health ก่อน smoke test:

```powershell
curl https://emer-api.scgs-ai.com/health
curl https://smart-emergency-test.vercel.app/emergency-api/health
```

ถ้า API source เปลี่ยนแต่ Docker ยังเสิร์ฟ image เก่า ให้ rebuild เฉพาะ API โดยไม่กระทบ DB volume:

```powershell
docker compose -f docker-compose.yml -f docker-compose.local.yml build api
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d api
```

รายละเอียด Vercel, Cloudflare Error 1033 และ checklist อยู่ที่ [RUNBOOK.md](docs/operations/RUNBOOK.md)

## Local Fallback

Local setup ยังเก็บไว้สำหรับ debug API/DB, แก้ migration และตรวจ flow ก่อน deploy ไม่ใช่ runtime หลักของทีม คัดลอก template เฉพาะเมื่อจำเป็น และเก็บ `.env` ไว้นอก Git เสมอ:

```powershell
copy .env.example .env
copy services\emergency-api\.env.example services\emergency-api\.env
pnpm install
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev:api
pnpm dev
```

Local URLs:

- Frontend: [http://localhost:3000](http://localhost:3000)
- Admin login: [http://localhost:3000/admin](http://localhost:3000/admin)
- API health: [http://localhost:4000/health](http://localhost:4000/health)
- DbGate: [http://localhost:8081](http://localhost:8081)

## คำสั่งหลัก

```powershell
pnpm test:api
pnpm build:api
pnpm build
pnpm db:migrate
pnpm db:seed
```

`Makefile` มี shortcut สำหรับงาน local/Docker เช่น `make db-migrate`, `make stack-build`, `make stack-up` และ `make stack-status`

## Runtime ที่ควรรู้

- Admin auth ปัจจุบันเป็น demo/localStorage/header contract ไม่ใช่ production authentication
- Role ที่รองรับคือ `super_admin`, `agency_admin`, `viewer`; ไม่มี `operator`
- `viewer` เห็นข้อมูลตาม scope แบบ read-only/passive แต่ไม่มี popup, sound, actionable alert หรือสิทธิ์เปลี่ยนสถานะ
- UUID เป็น internal id ส่วน UI ต้องแสดง `caseNumber` ก่อน แล้วค่อย fallback เป็น `id.slice(0, 8)` สำหรับข้อมูลเก่า
- Realtime ใช้ SSE เป็นหลักและมี polling fallback ที่ `/api/incidents/recent`

## ก่อนส่งงาน

- รัน tests/build ตาม scope ที่แก้
- ถ้าแก้ API, env, schema, realtime หรือ GIS ให้อัปเดต docs ที่เกี่ยวข้องใน commit เดียวกัน
- อย่า commit secret, tunnel token, เบอร์โทรจริง หรือข้อมูลส่วนบุคคล
- smoke บน Vercel อย่างน้อย: mobile Call, admin alert/queue/map/detail, viewer read-only, contacts, GIS, reports/call logs และ settings

## ข้อจำกัดปัจจุบัน

- Real auth/user management ยังรอ auth contract ของทีม; `widgets/admin-users` เป็น placeholder
- rate limiting มีบางจุดแล้ว แต่ shared-store rate limit สำหรับ production ยังต้อง review
- ทีมยังต้องกำหนด backup/restore policy ของ production database

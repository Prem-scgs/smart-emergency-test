# Smart Emergency

Smart Emergency เป็นโปรเจกต์ Next.js + Fastify + PostgreSQL/PostGIS สำหรับแจ้งเหตุฉุกเฉิน, dashboard admin, GIS boundary lookup และ realtime incident alerts

เอกสารนี้เป็นหน้าเริ่มต้นแบบสั้น ๆ สำหรับคนใหม่ ถ้าต้องลงลึกให้ไปต่อที่:

- ภาพรวมระบบ: [ARCHITECTURE_OVERVIEW.md](docs/architecture/ARCHITECTURE_OVERVIEW.md)
- กฎวางไฟล์ FSD-lite: [FSD_LITE_GUIDE.md](docs/architecture/FSD_LITE_GUIDE.md)
- วิธีรัน/แก้ปัญหา: [RUNBOOK.md](docs/operations/RUNBOOK.md)
- Environment variables: [ENVIRONMENT.md](docs/operations/ENVIRONMENT.md)
- API contract ปัจจุบัน: [API_CONTRACT.md](docs/api/API_CONTRACT.md)

## Project Structure

- `app/`: Next.js route/layout shell เท่านั้น
- `widgets/`: หน้า/section ใหญ่ เช่น dashboard, GIS, contacts, reports, settings, login, mobile flow
- `features/`: workflow เฉพาะเรื่อง เช่น incident alert, mobile incident, location sharing
- `entities/`: domain types/helpers เช่น incident, contact, area, call
- `shared/`: auth, config, API helpers, i18n, reference data, realtime, utils
- `components/ui/`: reusable UI primitives เท่านั้น
- `lib/`: tests และ wiring checks เท่านั้น ห้ามเพิ่ม runtime implementation ใหม่
- `services/emergency-api/`: Fastify backend service
- `services/emergency-api/db/`: migrations และ seed data

## Quick Start

1. ติดตั้ง dependencies

```powershell
pnpm install
```

2. สร้าง env local จาก template

```powershell
copy .env.example .env
copy services\emergency-api\.env.example services\emergency-api\.env
```

3. เปิด PostgreSQL/PostGIS และ DbGate

```powershell
pnpm db:up
docker compose up -d dbgate
```

4. apply migrations และ seed data

```powershell
pnpm db:migrate
pnpm db:seed
```

5. เปิด backend

```powershell
pnpm dev:api
```

6. เปิด frontend อีก terminal

```powershell
pnpm dev
```

## Local URLs

- Frontend mobile: [http://localhost:3000](http://localhost:3000)
- Admin login: [http://localhost:3000/admin](http://localhost:3000/admin)
- API health: [http://localhost:4000/health](http://localhost:4000/health)
- DbGate: [http://localhost:8081](http://localhost:8081)

## Common Commands

```powershell
pnpm dev
pnpm dev:api
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm test:api
pnpm build:api
pnpm build
```

ถ้าใช้ `make` ได้ มี shortcut ใน `Makefile` เช่น `make db-migrate`, `make api`, `make web`

## Environment Variables

อ่านรายละเอียดเต็มใน [ENVIRONMENT.md](docs/operations/ENVIRONMENT.md)

ตัวหลักที่ทีมต้องรู้:

- `DATABASE_URL`: backend ต่อ PostgreSQL/PostGIS
- `CORS_ORIGIN` / `CORS_ORIGINS`: allowlist frontend origin สำหรับ Fastify API
- `EMERGENCY_API_INTERNAL_URL`: ปลายทางที่ Next rewrite `/emergency-api/*` จะ proxy ไปหา
- `NEXT_PUBLIC_EMERGENCY_API_EXTERNAL_URL`: API domain/tunnel สำหรับ Vercel REST rewrite
- `NEXT_PUBLIC_EMERGENCY_EVENTS_EXTERNAL_URL`: API domain/tunnel สำหรับ SSE `EventSource`

Vercel test ปัจจุบันใช้ frontend ที่ `https://smart-emergency-test.vercel.app` และ API ผ่าน Cloudflare/custom domain เช่น `https://emer-api.scgs-ai.com`

## Current Runtime Notes

- Admin auth ยังเป็น demo/localStorage/header based ไม่ใช่ auth จริงของ production
- Supported admin roles มี `super_admin`, `agency_admin`, `viewer`; ไม่มี `operator`
- `viewer` เป็น read-only/passive: เห็นข้อมูลตาม scope แต่ไม่มี popup/sound/actionable alert และ update status ไม่ได้
- Incident ใช้ UUID เป็น internal id แต่ UI ต้องแสดง `caseNumber` ก่อน เช่น `EMS-20260706-0001`
- Realtime ใช้ SSE เป็นหลัก และมี polling fallback ผ่าน `/api/incidents/recent`
- Vercel demo ยังพึ่ง API/DB ที่เครื่องเปรมผ่าน Cloudflare tunnel/custom domain ถ้าเครื่อง/API/DB/tunnel ดับ frontend จะโหลดได้แต่ข้อมูลสดจะล้ม

## Before Commit Checklist

- รัน tests/build ที่เกี่ยวข้องแล้วหรือยัง
- ถ้าแก้ flow/API/env/schema/realtime/GIS ให้ update docs ที่เกี่ยวข้องใน commit เดียวกัน
- ไฟล์ runtime ใหม่อยู่ใน FSD-lite layer ถูกต้องหรือยัง
- อย่าเพิ่ม runtime implementation ใหม่ใน `lib/`
- ห้าม commit secret, token, tunnel token, เบอร์จริง หรือข้อมูลส่วนตัว

## Current Caveats

- Real auth/user management ยังรอ team auth contract; `widgets/admin-users` เป็น placeholder
- Rate limiting มีบางจุดแล้ว แต่ production shared-store rate limit ยังต้อง review ก่อน deploy จริง
- Backup/restore notes สำหรับ production DB ยังต้องให้ทีมเติม

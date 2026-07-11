# API Contract

เอกสารนี้สรุป API สำคัญที่ frontend ใช้จริงตอนนี้ ถ้าแก้ endpoint, response shape, role scope หรือ auth header ต้องอัปเดตไฟล์นี้ด้วย

Base URL local:

```text
http://localhost:4000
```

Vercel frontend เรียก REST ผ่าน:

```text
/emergency-api/*
```

API domain/tunnel สำหรับ Vercel test:

```text
https://emer-api.scgs-ai.com
```

## Identity Rules

- `id`: UUID ภายใน ใช้ใน route path, DB relation, tracking/status endpoints
- `caseNumber`: เลขเคสสำหรับผู้ใช้ เช่น `EMS-20260706-0001`
- UI ต้องแสดง `caseNumber` ก่อน ถ้าไม่มีให้ fallback เป็น `id.slice(0, 8)` เท่านั้น

## Admin Auth / Role Scope

```text
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/sse-ticket
```

Admin REST request ต้องส่ง `Authorization: Bearer <access-token>`. API verify JWT แล้วอ่าน `active`, role และ agency category ล่าสุดจาก `admin_users`/`agencies`; header/query scope จาก browser ไม่ใช่ security contract และถูกละทิ้งที่ API boundary

Roles:

- `super_admin`: เห็น/จัดการทุก category
- `agency_admin`: เห็น/จัดการเฉพาะ category ตัวเอง
- `viewer`: read-only/passive ตาม category

Token ฝั่ง frontend อยู่ใน `sessionStorage` และไม่มี Remember Me

## Health

```text
GET /health
```

ใช้เช็กว่า Fastify API และ DB health snapshot พร้อมหรือไม่

## Incidents

```text
POST   /api/incidents
GET    /api/incidents
GET    /api/incidents/recent
GET    /api/incidents/history
GET    /api/incidents/map-points
GET    /api/incidents/:id
GET    /api/incidents/:id/tracking
GET    /api/incidents/:id/events
PATCH  /api/incidents/:id/status
PUT    /api/incidents/:id/call
POST   /api/incidents/:id/share-attempts
```

สำคัญ:

- `POST /api/incidents` idempotent ด้วย `clientRequestId`
- `PATCH /api/incidents/:id/status` ใช้ `expectedVersion` กัน admin หลายคนแก้เคสเดียวกันพร้อมกัน
- `GET /api/incidents/recent?since=<cursor>&limit=50` เป็น polling fallback ของ dashboard
- `GET /api/incidents/:id/events?sessionId=<sessionId>` เป็น reporter-scoped SSE
- `POST /api/incidents/:id/share-attempts` บันทึกการพยายามแชร์ตำแหน่งและ validate reporter ownership
- `PUT /api/incidents/:id/call` จาก mobile ต้องส่ง reporter `sessionId`; UUID อย่างเดียวไม่ใช่หลักฐาน ownership ส่วน admin ใช้ Bearer JWT

DB ที่เกี่ยวข้องหลัก: `incidents`, `incident_status_history`, `incident_location_history`, `incident_case_counters`, `audit_logs`, `center_share_channels`

## Realtime

```text
GET /api/events?ticket=<one-time-ticket>
```

ใช้สำหรับ admin SSE stream

Events สำคัญ:

- `incident.created`
- `incident.status_updated`

Dashboard ต้อง de-duplicate ระหว่าง SSE และ polling fallback ด้วย incident id/status version

Ticket ได้จาก `POST /api/auth/sse-ticket`, มีอายุสั้นและใช้ได้ครั้งเดียว ห้ามใส่ access JWT ใน URL

## Contacts

```text
GET    /api/contacts
POST   /api/contacts
PUT    /api/contacts/:id
DELETE /api/contacts/:id
```

Role behavior:

- `super_admin`: CRUD ทุก category
- `agency_admin`: CRUD เฉพาะ category ตัวเอง
- `viewer`: read-only

DB หลัก: `contacts`

## Areas / GIS

```text
GET    /api/areas
POST   /api/areas
PUT    /api/areas/:id
DELETE /api/areas/:id
GET    /api/areas/resolve-point
GET    /api/areas/:id/contacts
GET    /api/areas/:id/incidents
POST   /api/areas/:id/contains-point
```

ใช้กับ GIS page, dashboard selected-area bounds และ mobile location/contact matching

DB หลัก: `areas`, `contacts`, `incidents`

ระวัง coordinate order:

- API/UI หลายจุดใช้ `latitude`/`longitude`
- GeoJSON/map ใช้ `[lng, lat]`

## Reference Data

```text
GET /api/reference/categories
GET /api/reference/provinces
GET /api/reference/districts
GET /api/reference/share-channels
```

ใช้ให้ frontend ไม่ต้อง hardcode category/province/district/share-channel availability ใน UI

DB/env หลัก: `emergency_categories`, `areas`, `center_share_channels`, share channel env fallback

## Admin Settings

```text
GET /api/admin/organization-settings
PUT /api/admin/organization-settings
GET /api/admin/share-channels
PUT /api/admin/share-channels
```

Behavior:

- organization settings read ได้เมื่อมี admin scope
- organization settings write เป็น `super_admin` only
- share channels read/write เป็น `super_admin` only
- write สำคัญต้องลง `audit_logs`

DB หลัก: `system_settings`, `center_share_channels`, `audit_logs`

## Admin Users

```text
GET    /api/admin/users
POST   /api/admin/users
PATCH  /api/admin/users/:id
DELETE /api/admin/users/:id
```

- เฉพาะ `super_admin`
- `DELETE` เป็น soft deactivate เพื่อรักษา audit และ incident status history
- ห้ามเปลี่ยน role, reset password, deactivate หรือลบบัญชีตัวเอง
- `agency_admin`/`viewer` ต้องผูก agency จริง ส่วน `super_admin` ต้องไม่มี agency

DB หลัก: `admin_users`, `agencies`, `audit_logs`

## Reports

```text
GET /api/reports/summary
```

ใช้กับ reports page เพื่อสร้าง KPI, charts, tables, CSV/PDF/print

Role scope:

- `super_admin`: เห็นภาพรวมทุก category
- `agency_admin`/`viewer`: scoped ตาม category

## What Is Not Current Contract

เอกสาร historical บางไฟล์พูดถึง endpoint เก่า เช่น:

```text
POST /api/incidents/:id/locations
```

endpoint นี้ยังไม่ใช่ current runtime API contract จาก source ปัจจุบัน ถ้าจะเพิ่มในอนาคตต้องออกแบบ/ทดสอบใหม่และอัปเดตไฟล์นี้

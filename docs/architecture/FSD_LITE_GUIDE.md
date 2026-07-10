# FSD-lite Guide

Smart Emergency ใช้ FSD-lite เพื่อให้ route files สั้น, เห็น owner ของ domain ชัด และลด runtime logic ที่กระจายอยู่ใน `lib/`

อ่านคู่กับ [CODE_CONVENTIONS_TH.md](CODE_CONVENTIONS_TH.md) และ [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md)

## Dependency Direction

ทิศทาง dependency ที่ถูกต้อง:

```txt
app -> widgets -> features -> entities -> shared
```

กฎสำคัญ:

- `shared` ห้าม import จาก `entities`, `features`, `widgets`, `app`
- `entities` ห้าม import จาก `features`, `widgets`, `app`
- `features` ห้าม import จาก `widgets`, `app`
- `widgets` ห้าม import จาก `app`
- `app` ควรเป็น route/layout shell ที่ประกอบ widget/provider เท่านั้น
- `lib/` ใช้สำหรับ tests/wiring checks เท่านั้น ห้ามเพิ่ม runtime implementation ใหม่

## Layer Responsibilities

- `app/`: Next.js route shell, layout shell, provider composition
- `widgets/`: หน้า/section ใหญ่ที่รวม state, UI, feature/entity หลายส่วน
- `features/`: workflow/action เฉพาะเรื่อง เช่น incident alert, location sharing, mobile incident
- `entities/`: domain types/helpers เช่น incident status, contact scope, area geometry
- `shared/`: utility/config/auth/i18n/reference/realtime/API helpers ที่ใช้ข้าม domain
- `components/ui/`: primitive UI ที่ไม่รู้จัก business domain
- `services/emergency-api/`: backend service แยกจาก Next.js

## Current Ownership Map

### Frontend Shells

- `widgets/admin-shell`: admin layout, sidebar/header, notification bell/center, organization settings loading
- `widgets/admin-login`: admin login page, role selector, agency selector
- `widgets/mobile-emergency`: mobile app shell, splash, location header, category grid, SOS, nav, selection, tracking/history

### Admin Pages

- `widgets/dashboard-map`: dashboard data, map section, queue, map, detail panel, status timeline, KPI/chart view-model helpers
- `widgets/admin-contacts`: contacts page UI, filters, CRUD dialog, location selector, delete flow
- `widgets/admin-gis`: GIS page UI, area filters, sidebars, boundary map, contact/incident lists
- `widgets/admin-reports`: reports page UI, range filter, KPI/charts/tabs, CSV/PDF/print
- `widgets/admin-call-logs`: call logs UI, filters, pagination, CSV/PDF/print
- `widgets/admin-settings`: personal preferences, organization settings, share-channel settings, health snapshot
- `widgets/admin-users`: placeholder page ระหว่างรอ team auth/user-management contract

### Features

- `features/incident-alert`: alert popup, notification provider/hook, admin SSE hook, visibility rules, sound preferences, detail navigation, alert/SSE types
- `features/mobile-incident`: mobile incident payload, GPS lock status, reporter session/phone localStorage helpers
- `features/location-sharing`: production incident location sharing helpers และ `IncidentLocationShareCard`

### Entities

- `entities/incident`: incident status workflow/meta/display helpers และ emergency category types
- `entities/contact`: contact coverage/display/phone/role/scope helpers และ contact type
- `entities/area`: polygon bounds, area display labels, severity color, GeoJSON feature helpers
- `entities/call`: call status และ call log types

### Shared

- `shared/api`: admin API headers/scope helpers
- `shared/auth`: `AuthProvider`, `useAuth`, admin role/session types, `ROLE_PERMISSIONS`
- `shared/config`: browser-safe emergency API URL helpers
- `shared/i18n/admin`: admin language provider/hook และ Thai/English dictionaries
- `shared/location`: location value type, province/district reference loaders, lookup maps
- `shared/reference`: emergency category reference loaders/display helpers
- `shared/realtime`: pure realtime payload validators, SSE URL helpers, polling constants
- `shared/utils`: `cn` className helper

## File Placement Checklist

ก่อนสร้างไฟล์ใหม่ ให้ถามแบบนี้:

1. เป็น route/layout ของ Next.js หรือไม่ ถ้าใช่ให้อยู่ `app/`
2. เป็นหน้าใหญ่หรือ section ใหญ่ที่ถือ state/UI หลายส่วนหรือไม่ ถ้าใช่ให้อยู่ `widgets/`
3. เป็น workflow/action เฉพาะเรื่องหรือไม่ ถ้าใช่ให้อยู่ `features/`
4. เป็น domain type/helper หรือไม่ ถ้าใช่ให้อยู่ `entities/`
5. เป็น utility/config/i18n/API/realtime/reference ที่ใช้ข้าม domain หรือไม่ ถ้าใช่ให้อยู่ `shared/`
6. เป็น UI primitive ที่ไม่มี business logic หรือไม่ ถ้าใช่ให้อยู่ `components/ui/`

ถ้าตอบไม่ได้ ให้หยุดถามก่อนสร้างไฟล์ เพราะไฟล์ที่วางผิด layer จะทำให้ refactor รอบต่อไปแพงขึ้น

## `lib/` Rule

สถานะปัจจุบัน: `lib/` ไม่ใช่ runtime layer แล้ว ใช้เป็นที่เก็บ tests และ wiring checks เป็นหลัก

ห้ามเพิ่ม runtime implementation ใหม่ เช่น helper, hook, type owner, API client หรือ business logic ใน `lib/`

ถ้าเจอ import เก่าจาก `lib/` ในอนาคต:

1. ใช้ `rg` หา caller ทั้งหมด
2. ย้าย implementation ไป owner ที่ถูกต้องใน `shared`, `entities`, `features`, หรือ `widgets`
3. รัน tests/build ที่เกี่ยวข้อง
4. ลบ bridge เฉพาะเมื่อ `rg` ยืนยันว่าไม่มี import เหลือ

## Migration History Summary

ก่อนหน้านี้ repo เคยมี runtime logic หลายส่วนใน `lib/`, `components/admin`, และ `components/mobile` แต่ถูกย้ายตาม FSD-lite แล้ว

ตัวอย่างที่ย้ายเสร็จ:

- Dashboard queue/map/detail/status timeline อยู่ใต้ `widgets/dashboard-map`
- Admin pages อยู่ใต้ `widgets/admin-*`
- Mobile app/screens อยู่ใต้ `widgets/mobile-emergency`
- Location sharing อยู่ใต้ `features/location-sharing`
- Alert/notification/SSE admin hook อยู่ใต้ `features/incident-alert`
- Auth/i18n/config/reference/location อยู่ใต้ `shared/*`

เอกสารเก่าใน `docs/plans` และ `docs/specs` อาจยังพูดถึง path เดิม ให้ถือเป็น historical/spec-only จนกว่าเอกสารนั้นจะบอกว่าเป็น current contract

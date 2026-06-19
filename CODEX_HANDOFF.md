# Codex Handoff

Use this file as the shared memory between Codex sessions, including Codex in chat and Codex in VS Code. Keep it short and update it at the end of each work session.

## Project

- Path: `D:\testwork_Fullstack(SCSG)\smart-emergency`
- Repository: `https://github.com/SCGS7788/smart-emergency.git`
- Branch: `Prem(scgs)-emergencyV0`
- Preferred style: use `$token-lean-workflow`, read only relevant files, summarize briefly.

## Session Memory Files

- Main handoff: `CODEX_HANDOFF.md`
- Production roadmap: `PRODUCTION_CHECKLIST.md`
- Session-by-session notes: `SESSION_LOG.md`

Recommended resume order:

1. Read `CODEX_HANDOFF.md`
2. Read `PRODUCTION_CHECKLIST.md`
3. Read `SESSION_LOG.md`
4. Continue from `Current phase`, `Current task`, and `Next action`

## Current Status

- Project cloned from GitHub branch `Prem(scgs)-emergencyV0`.
- Files were moved from `C:\Users\User\Documents\smart-emergency` to `D:\testwork_Fullstack(SCSG)\smart-emergency`.
- Old source folder may still have a locked `.git` folder because Windows/Codex had it open during the move.
- Dependencies installed with `pnpm`.
- Dev server tested successfully at `http://localhost:3000`.
- Browser check loaded the home page with title `Smart Emergency - Emergency Response Platform`.
- Added `services/emergency-api` as a separate Fastify/TypeScript backend microservice.
- Added Docker Compose PostgreSQL/PostGIS DB at `localhost:5432`.
- Replaced Adminer with DbGate for database UI at `http://localhost:8081`.
- Emergency API tested successfully at `http://localhost:4000`.
- Added regression tests for `GET /api/incidents/:id` and verified them with `pnpm test:api`.
- Added shared module-level cache loaders for reference categories and locations to reduce duplicate fetches across admin/mobile screens.
- Added `lib/user-profile.ts` so mobile profile now loads from `/api/users/mock-profile` with fallback caching instead of importing `mockUserProfile` directly.
- Added `services/emergency-api/src/modules/contacts/routes.test.ts` and fixed `PUT /api/contacts/:id` so missing contacts now return HTTP 404 instead of a 200 error payload.
- Added `services/emergency-api/src/config.test.ts`, refactored `services/emergency-api/src/config.ts` to validate env values with zod, and added root `.env.example`.
- Added `services/emergency-api/src/observability.ts` and `services/emergency-api/src/observability.test.ts`, then wired structured request/response/error logging into `services/emergency-api/src/server.ts`.
- Rewrote root `README.md` and added `RUNBOOK.md` so the repo now documents current setup, migration, seed, verify, and troubleshooting flow.
- Added `services/emergency-api/src/api-error.ts` and started standardizing API errors to include `error`, `code`, and `statusCode`.
- Expanded the new error payload helper into `areas` and `reference` not-found responses, with regression tests for both modules.
- Added `services/emergency-api/src/rate-limit.ts` and applied a first in-memory per-IP limiter to `POST /api/incidents`.
- Added `services/emergency-api/db/migrations/009_audit_logs.sql`, `services/emergency-api/src/audit-log.ts`, and wired first-slice audit logging into contact and incident write flows.
- Expanded audit coverage into `areas.create`, `areas.update`, and `areas.delete`, with route-level regression coverage for area creation.
- Implemented first backend modules: contacts CRUD, areas polygon, point-in-polygon, incidents logs/map points, and SSE alert events.
- Added contacts schema fields for frontend mock data: `category`, `province`, `district`, `is_24_hours`.
- Added dev seed data at `services/emergency-api/db/seeds/dev_seed.sql`.
- Seed imported 5 mock emergency contacts and 3 mock call-log incidents into PostgreSQL.
- Added `.dockerignore` for cleaner future Docker builds.
- Added `Makefile` command shortcuts, but this Windows PowerShell environment does not currently have `make` installed; use equivalent `pnpm` scripts unless running from WSL/Git Bash with make.
- Connected the GIS dashboard page to real backend API data for contacts and incident map points.
- `/admin/gis` now fetches `GET /api/contacts` and `GET /api/incidents/map-points` from `http://localhost:4000`.
- Moved the incident map/log view from `/admin/gis` to `/admin/dashboard`.
- Restored `/admin/gis` as GIS area management for province/district/response-area polygons.
- `GET /api/incidents/map-points` now enriches each incident with containing area info from PostGIS (`areaId`, `areaName`, `areaColor`).
- Dashboard incident map now uses Leaflet/react-leaflet, so it can pan, zoom, and show incident popups.
- Dashboard stats, charts, and recent incidents now derive from `GET /api/incidents/map-points` and `GET /api/contacts` instead of the old dashboard mock object.
- Rebuilt `/admin/dashboard` as a role-scoped operations dashboard: superadmin sees all categories, agency roles see only their allowed category before category/area filters are applied. The page now has Thai labels, KPI cards, incident map, recent incidents, category chart, area summary, and time trend.
- `components/admin/incident-map.tsx` popup labels now show Thai category/status/area text.
- Fixed Leaflet map layering over dialogs by isolating map containers at `z-0` and raising shared `Dialog`/`AlertDialog` overlays/content above Leaflet panes/controls.
- Refined `/admin/dashboard` filter bar layout into one compact card with consistent select controls.
- Replaced the frontend mock realtime hook with `EventSource` against `http://localhost:4000/api/events`. New `incident.created` events now create real dashboard notifications and high/critical alerts scoped by category/agency.
- Added generated alert sound in `components/admin/alert-display.tsx` using the Web Audio API, so dashboard alerts can sound without bundling an audio asset.
- Rewrote `components/admin/alert-display.tsx` to clean up Thai text corruption and keep the dialog queue stable when alerts are dismissed.
- `/admin/contacts` was rebuilt as a real API-backed CRUD page using `GET/POST/PUT/DELETE /api/contacts`.
- CRUD verification passed against the live backend/DB: created a temporary contact, updated it, confirmed it existed, deleted it, and confirmed it was gone.
- Added `003_mock_reference_data.sql` to move the remaining `lib/mock-data.ts` groups into PostgreSQL: emergency categories, provinces, districts, dashboard snapshot, mock user profile, and user emergency contacts.
- Expanded `dev_seed.sql` so all mock groups can be seeded into DB. Current seed counts: 6 categories, 14 provinces, 18 districts, 5 seeded emergency contacts, 3 seeded call-log incidents, 1 dashboard snapshot, 1 app user, 3 user emergency contacts.
- Added reference read APIs: `/api/reference/categories`, `/api/reference/provinces`, `/api/reference/districts`, `/api/dashboard/snapshot`, `/api/users/mock-profile`.
- Expanded incident records/API with call-log fields from the old mock: `agencyContactId`, `agencyName`, `agencyPhone`, `province`, `district`, `accuracy`, and `callStatus`.
- Removed call duration from the call logs scope: `/admin/call-logs` no longer shows the duration column, `incidents.duration_seconds` was dropped by `005_drop_incident_duration.sql`, and API responses no longer expose `durationSeconds`.
- `/admin/call-logs` now reads from `GET /api/incidents` and `GET /api/reference/categories` instead of the local mock call log list. It maps `createdAt`, `category`, `agencyName`, `agencyPhone`, `province/district`, and `callStatus` into the call log table.
- Added `GET /api/incidents/:id` and switched mobile incident tracking to load one incident directly instead of fetching the full incident list.
- Added `lib/reference-cache.test.ts` to verify category/location cache reuse with `tsx --test`.
- Added `lib/user-profile.test.ts` to verify cached user profile loading and fallback behavior.
- Added `004_area_boundary_metadata.sql` to make `areas.polygon` a `GEOMETRY(MULTIPOLYGON, 4326)` and add boundary metadata: `area_type`, `source`, `source_code`, province/district codes/names, and `parent_area_id`.
- Added `pnpm db:migrate:areas` and `pnpm db:import:boundaries`.
- Imported official Thailand province/district boundaries from `chingchai/OpenGISData-Thailand` into PostGIS. Current official boundary counts in `areas`: 77 province MultiPolygons and 928 district MultiPolygons.
- Cleaned old non-official district mock rows (`Siam`, `Silom`, `Sukhumvit`, `Mueang`, `Pattaya`) so `districts` reference count matches official boundaries: 928.
- Confirmed focus provinces are present: Bangkok has 1 province + 50 district boundaries, Chiang Mai has 1 + 25, Phitsanulok has 1 + 9.

## Last Known Commands

```powershell
git clone --branch "Prem(scgs)-emergencyV0" --single-branch https://github.com/SCGS7788/smart-emergency.git .
git status --short --branch
pnpm install
pnpm approve-builds --all
pnpm dev
pnpm db:up
docker compose up -d dbgate
pnpm db:migrate:contacts
pnpm db:migrate:mock
pnpm db:migrate:areas
pnpm db:migrate:call-logs
pnpm db:seed
pnpm db:import:boundaries
pnpm --filter emergency-api build
pnpm dev:api
pnpm build
```

## Working Notes

- Update this section with important decisions, bugs, and file changes.
- Prefer concise bullets. Do not paste long logs unless they are essential.
- Git identity rule: before any future commit or push, ask Prem which git user/email to use. Current local repo config is `user.name=Prem-scgs` and `user.email=premchai_j@scgs.co`.
- Added `pnpm-workspace.yaml` to allow build scripts for `msw` and `sharp`; `pnpm install`/`pnpm dev` failed before approving these builds.
- Architecture choice: keep Next.js as frontend and create `emergency-api` as the first backend microservice.
- DB choice: use PostgreSQL/PostGIS in Docker because polygon and point-in-polygon are core requirements.
- DB UI choice: use DbGate instead of Adminer because the UI is easier to browse while learning.
- `GET /api/events` uses Server-Sent Events for dashboard alert notifications; it is simpler than WebSocket for one-way alert delivery.
- `pnpm approve-builds --all` was needed again for `esbuild`, used by `tsx`.
- Seed strategy: keep mock-derived data as dev seed SQL, not as migration data. Migration changes schema; seed inserts sample rows.
- `pnpm db:seed` is idempotent for seed rows because it uses fixed UUIDs and `ON CONFLICT`.
- Makefile is for shorter team commands and lower context overhead, but `pnpm` scripts remain the Windows-friendly fallback.
- Token-cost rule for `shadcn-skills`: do not use by default. Use only for larger shadcn-specific UI work such as creating a new admin surface, redesigning a full section, or reviewing a shared UI component for consistency. Do not use it for backend, GIS logic, data flow, small spacing/text tweaks, or routine CRUD wiring.
- If `shadcn-skills` is used in a future session, prefer the cheapest path first: review existing local `components/ui` patterns, then use discovery/review only when the local pattern library does not answer the problem clearly.
- Leaflet is installed at the frontend workspace root (`leaflet`, `react-leaflet`, `@types/leaflet`) for interactive OpenStreetMap rendering.
- Contacts page intentionally no longer imports `lib/mock-data.ts`; category options are local reference values and records come from PostgreSQL.
- `lib/mock-data.ts` still exists for legacy screens, but its data now has DB-backed equivalents. Next cleanup step is replacing imports page-by-page, then deleting or shrinking the mock file.
- `/api/areas` currently returns all boundaries and polygons, now 1007 rows after the full import. Before wiring this to map UI, add query filters/pagination such as `areaType`, `provinceCode`, and `includeGeometry` to avoid loading the whole country into the frontend.
- `/api/areas` now supports filters: `areaType`, `provinceCode`, `districtCode`, `source`, and `includeGeometry=false`.
- Added `/api/areas/:id/incidents` alongside `/api/areas/:id/contacts`.
- Rebuilt `/admin/gis` as the first GIS management MVP:
  - loads province boundaries without geometry for the dropdown
  - loads only selected province districts with geometry
  - renders district polygons with Leaflet
  - clicking/list-selecting a district loads contacts/incidents inside the polygon using PostGIS
- Added `components/admin/gis-boundary-map.tsx` for the interactive GIS polygon map.
- GIS map now renders selected-area markers: blue circle markers for emergency contacts and severity-colored circle markers for incidents, with popups.
- GIS page includes a small map legend and passes PostGIS-selected contacts/incidents into the map component.
- Verification: `pnpm build:api` passed, `pnpm build` passed, `/admin/gis` returned 200, province filter returned 77, Bangkok district filter returned 50, and Pathum Wan area contacts endpoint returned 4 contacts.
- Latest verification after marker work: `pnpm build` passed, `/admin/gis` returned 200, and a Pathum Wan contact has lat/lng for marker rendering.
- Latest verification after realtime alert work: `pnpm build` passed, backend health returned 200, `/admin/dashboard` returned 200, `/api/events` emitted `incident.created` after a test POST, and the temporary test incident was deleted.
- Latest verification after incident detail work: `pnpm test:api` passed, `pnpm build:api` passed, and `pnpm build` passed.
- Latest verification after reference-cache work: shared cache regression test passed, `pnpm test:api` passed, `pnpm build:api` passed, and `pnpm build` passed.
- Latest verification after mobile profile work: user profile loader regression test passed, `pnpm test:api` passed, `pnpm build:api` passed, and `pnpm build` passed.
- Latest verification after contacts status fix: contact route regression test passed, `pnpm test:api` passed, `pnpm build:api` passed, and `pnpm build` passed.
- Latest verification after config hardening: config regression tests passed, `pnpm test:api` passed, `pnpm build:api` passed, and `pnpm build` passed.
- Latest verification after observability work: observability regression tests passed, `pnpm test:api` passed, `pnpm build:api` passed, and `pnpm build` passed.
- Latest documentation verification: `git status --short README.md RUNBOOK.md` showed the expected changes and both files were re-read from disk after editing.
- Latest verification after API error-shape work: `pnpm test:api` passed, `pnpm build:api` passed, and `pnpm build` passed.
- Latest verification after areas/reference error-shape rollout: `pnpm test:api` passed, `pnpm build:api` passed, and `pnpm build` passed.
- Latest verification after rate-limiting work: `pnpm test:api` passed, `pnpm build:api` passed, and `pnpm build` passed.
- Latest verification after audit-logging work: `pnpm test:api` passed, `pnpm build:api` passed, `pnpm build` passed, and `pnpm db:migrate:audit-logs` applied successfully.
- Latest verification after extending audit coverage to areas: `pnpm test:api` passed, `pnpm build:api` passed, and `pnpm build` passed.

## Next Steps

- Current priority: implement real case status tracking controlled by Admin.
- Approved design: `docs/superpowers/specs/2026-06-18-incident-status-tracking-design.md`.
- Execution checklist: `docs/superpowers/plans/2026-06-18-incident-status-tracking.md`.
- Task 1 complete: migration `016_incident_tracking.sql` is applied and verified idempotent.
- Task 2 complete: status transition rules are implemented with 9 focused tests.
- Task 3 complete: incident creation is idempotent, persists `dialed_phone`, and atomically creates initial status/location history.
- Task 4 tracking read complete: `GET /api/incidents/:id/tracking` returns the incident, status history, latest location, and location history with reporter-session ownership or Admin scope validation.
- Task 4 status update complete: `PATCH /api/incidents/:id/status` uses a locked transaction, validates role/transition rules, returns `409 INCIDENT_STATUS_CONFLICT` for stale versions, appends status history, and emits `incident.status_updated` only after commit.
- Admin Dashboard now has a real incident queue synchronized with map selection plus a Sheet detail panel that reads `/tracking`, updates status, handles 409 by refetching, and renders the status timeline.
- Status controls now let `super_admin` select any other workflow status. Moving backward requires a reason; `agency_admin` still moves forward one step only.
- Closing an incident no longer requires a resolution summary. If the summary is blank, the Admin UI shows an explicit confirmation dialog before submitting.
- Admin SSE client now receives `incident.status_updated`; Dashboard and an open matching detail panel refetch authoritative data without replacing the selected case.
- Mobile tracking now loads authoritative `/tracking` data and uses reporter-owned `GET /api/incidents/:id/events`; status events trigger a refetch and never expose the shared Admin stream.
- Mobile Refresh now reloads status/history from `/tracking` instead of fetching only the basic incident record.
- Browser QA passed at mobile and desktop widths. The nested trigger and localStorage auth hydration errors in Admin layout were fixed; a fresh reload produced no new console errors.
- Next action: finish Task 4 with `POST /api/incidents/:id/locations`, then complete queue grouping/unread indicators.
- Continue in order: DB -> workflow rules -> incident APIs/SSE -> one SSE client -> Mobile -> Admin queue/detail -> E2E verification.
- Keep the simulated Mobile call screen and call-result choices temporarily, but remove the reporter-phone form; never persist its timer/Connected label as authoritative call data.
- Browser CORS now explicitly allows `GET`, `HEAD`, `POST`, `PUT`, `PATCH`, `DELETE`, and `OPTIONS` so Admin status and Mobile call-result updates work.
- Mobile call feedback sends `reporterPhone: null`; `dialed_phone` remains the number captured when Call is tapped.
- Store `dialed_phone` when Call is tapped; it means attempted dial, not confirmed connection.
- Final JWT implementation remains owned by Prem's team; backend authorization boundaries must stay replaceable.
- Known blocker to fix in this feature: two active SSE implementations (`use-sse` and `use-websocket`) currently create duplicate connections.
- Known audit issues outside this immediate plan: contacts CRUD lacks backend role enforcement; migration scripts/reference routes still need cleanup after mock-table removal.
- Before finishing future sessions, update this file and check `git status`.

## Handoff Prompt

```text
Read CODEX_HANDOFF.md first, then PRODUCTION_CHECKLIST.md, then SESSION_LOG.md. Continue from the latest status. Use $token-lean-workflow: inspect only relevant files, keep updates concise, and update these tracking files before finishing.
```

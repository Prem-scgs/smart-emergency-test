# Codex Handoff

Use this file as the shared memory between Codex sessions, including Codex in chat and Codex in VS Code. Keep it short and update it at the end of each work session.

## Project

- Path: `D:\testwork_Fullstack(SCSG)\smart-emergency`
- Repository: `https://github.com/SCGS7788/smart-emergency.git`
- Branch: `Prem(scgs)-emergencyV0`
- Preferred style: use `$token-lean-workflow`, read only relevant files, summarize briefly.

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
- `/admin/contacts` was rebuilt as a real API-backed CRUD page using `GET/POST/PUT/DELETE /api/contacts`.
- CRUD verification passed against the live backend/DB: created a temporary contact, updated it, confirmed it existed, deleted it, and confirmed it was gone.
- Added `003_mock_reference_data.sql` to move the remaining `lib/mock-data.ts` groups into PostgreSQL: emergency categories, provinces, districts, dashboard snapshot, mock user profile, and user emergency contacts.
- Expanded `dev_seed.sql` so all mock groups can be seeded into DB. Current seed counts: 6 categories, 14 provinces, 18 districts, 5 seeded emergency contacts, 3 seeded call-log incidents, 1 dashboard snapshot, 1 app user, 3 user emergency contacts.
- Added reference read APIs: `/api/reference/categories`, `/api/reference/provinces`, `/api/reference/districts`, `/api/dashboard/snapshot`, `/api/users/mock-profile`.
- Expanded incident records/API with call-log fields from the old mock: `agencyContactId`, `agencyName`, `agencyPhone`, `province`, `district`, `accuracy`, and `callStatus`.
- Removed call duration from the call logs scope: `/admin/call-logs` no longer shows the duration column, `incidents.duration_seconds` was dropped by `005_drop_incident_duration.sql`, and API responses no longer expose `durationSeconds`.
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

## Next Steps

- Continue feature work or inspect current UI flows.
- Continue reducing remaining legacy mocks in lower-priority pages such as `/admin/call-logs`, `/admin/users`, and mobile/demo components.
- Start replacing remaining `lib/mock-data.ts` imports with the new reference/user/dashboard APIs.
- Dashboard now shows backend-backed Leaflet incident markers and log filters; next step is adding alert sound from `/api/events`.
- GIS page now focuses on boundary management and reads `GET /api/areas`.
- Add alert sound in dashboard when `/api/events` receives `incident.created`.
- Add full polygon drawing/editing UI for `/admin/gis`; backend endpoints already exist for areas.
- Next GIS step: add toggles for showing/hiding contacts/incidents, then add response-zone CRUD/drawing controls. Official province/district boundaries should be read-only; user-created response zones can be editable.
- Before finishing future sessions, update this file and check `git status`.

## Handoff Prompt

```text
Read CODEX_HANDOFF.md first. Continue from the latest status. Use $token-lean-workflow: inspect only relevant files, keep updates concise, and update this handoff before finishing.
```

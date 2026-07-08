# Runbook

Short local operations guide for Smart Emergency.

## 1. First-Time Setup

Install dependencies:

```powershell
pnpm install
```

Copy env template if needed:

```powershell
copy .env.example .env
```

Start database services:

```powershell
pnpm db:up
docker compose up -d dbgate
```

Apply migrations:

```powershell
pnpm db:migrate
```

Seed local data:

```powershell
pnpm db:seed
```

## 2. Start the App

Backend:

```powershell
pnpm dev:api
```

Frontend:

```powershell
pnpm dev
```

## 3. Clean Reset

If local DB state is broken:

```powershell
docker compose down -v
docker compose up -d db dbgate
pnpm db:migrate
pnpm db:seed
```

Migration `015_drop_mock_tables.sql` removes legacy mock tables
`dashboard_snapshots`, `app_users`, and `user_emergency_contacts`. Do not add
new runtime features that depend on those tables; use incidents, contacts,
areas, reference categories, and system settings instead.

## 3.1 Auth Boundary

Admin role scope is currently a development/demo contract. The frontend sends
`x-admin-role` and `x-admin-category` headers, and the backend uses them to
filter demo data. This is not production authentication. Do not build new
security-sensitive behavior on these headers until the real JWT/Auth contract
from the owning team is integrated.

Current demo roles:

- `super_admin`: can view and manage every category.
- `agency_admin`: can view and manage incidents/contacts in its own category.
- `viewer`: must log in, is scoped to one category, and is read-only.
- `viewer` may receive passive dashboard/queue/map updates through SSE or
  polling, but must not receive popup alerts, alert sound, actionable
  notifications, or write access.

The login screen intentionally exposes only `super_admin`, `agency_admin`, and
`viewer`. Keep `operator` out of the login role options unless the product scope
is reopened.

## 3.2 Current Important Flows

This section documents the current demo/runtime behavior. Keep it updated when
incident, realtime, role scope, map, or Vercel tunnel behavior changes.

### Incident create -> alert -> tracking

1. Mobile resolves the selected category and area, then calls
   `POST /api/incidents` with `clientRequestId`, `sessionId`, `dialedPhone`,
   location, category, severity, and optional call result fields.
2. The API validates category, phone, and location codes, resolves province and
   district from PostGIS when possible, then inserts the incident in PostgreSQL.
3. Incident creation is idempotent by `clientRequestId`. A duplicate request
   returns the existing incident with HTTP `200` and the same `caseNumber`.
4. New incidents get a display number such as `EMS-20260706-0001`. UUID remains
   the internal route/API id for endpoints such as
   `/api/incidents/:id/tracking`.
5. On successful insert, the API writes initial status/location history, audit
   log, and emits `incident.created`.
6. Admin receives the incident through SSE or polling fallback. `super_admin`
   and `agency_admin` may see popup/sound/actionable alerts; `viewer` receives
   passive data refresh only.
7. Mobile tracking reads authoritative state from
   `GET /api/incidents/:id/tracking?sessionId=...` and displays `caseNumber`
   instead of a full UUID.

Case number format:

```text
<PREFIX>-YYYYMMDD-0001
```

Current category prefixes:

- `POL`: police
- `EMS`: medical
- `FIR`: fire
- `RES`: rescue
- `FLD`: flood
- `RTA`: road-accident
- unknown categories fallback to the first 3 uppercase alphanumeric characters

The sequence is per category per Bangkok date. Migration
`020_incident_case_number.sql` backfills old incidents and creates
`incident_case_counters`.

### Admin realtime and polling fallback

Admin has one canonical realtime owner through the notification provider. It
opens:

```text
GET /api/events?role=<role>&category=<category>
```

The stream emits:

- `incident.created`
- `incident.status_updated`

SSE is the primary path. The browser also polls:

```text
GET /api/incidents/recent?since=<cursor>&limit=50
```

Polling is intentionally always on as a fallback for tunnel/browser/network
cases where SSE connects but events do not reach the browser reliably. The
client de-duplicates created incidents by incident id and status updates by
`id:statusVersion`, so the same incident should not alert twice.

### Mobile tracking and status flow

Mobile tracking is reporter-scoped by `sessionId`:

```text
GET /api/incidents/:id/tracking?sessionId=<mobile-session-id>
GET /api/incidents/:id/events?sessionId=<mobile-session-id>
GET /api/incidents/history?sessionId=<mobile-session-id>
```

Admin status changes use:

```text
PATCH /api/incidents/:id/status
```

The request includes `fromStatus`, `toStatus`, and `expectedVersion`. The API
uses optimistic concurrency and returns `409` if another admin changed the case
first. Status changes append to `incident_status_history` and emit
`incident.status_updated` after commit.

### Contacts role scope

Contacts are used by Mobile to find the phone number for a category and area,
and by Admin to manage emergency numbers.

- `super_admin`: can view and manage all contacts.
- `agency_admin`: can view and manage contacts only in its own category.
- `viewer`: can view scoped contacts but cannot create, edit, delete, or update
  incident call status.

Area matching prefers district contacts, then province contacts, then central
contacts where province/district are empty.

### GIS and map flow

GIS/admin map data comes from the API and PostGIS, not frontend-only mock data.

- `GET /api/incidents/map-points` returns incident markers with `caseNumber`,
  category, status, severity, location, and matched area metadata.
- `GET /api/areas` loads area boundaries.
- `GET /api/areas/resolve-point` resolves a latitude/longitude to an area.
- `GET /api/areas/:id/contacts` and `GET /api/areas/:id/incidents` power the GIS
  side panel for a selected area.

User-facing UI should show `caseNumber` or a short fallback `id.slice(0, 8)`;
do not render the full UUID as the incident number.

### Dashboard widget, map, and detail scope

The dashboard route is now a shell that passes auth, i18n, and reference data
into `widgets/dashboard-map`. That widget owns the dashboard data hook, selected
incident detail controller, selected-area bounds, map/filter view-model helpers,
`IncidentQueue`, and `IncidentMap`.

The old `components/admin/incident-queue.tsx` bridge has been removed after
`rg` confirmed no runtime imports remained. Add queue runtime logic under
`widgets/dashboard-map` instead.

The old `components/admin/incident-map.tsx` bridge has been removed after `rg`
confirmed no runtime imports remained. Map runtime logic, marker display
helpers, viewport behavior, geolocation handling, and selected-area bounds
wiring belong under `widgets/dashboard-map`.

The old `components/admin/incident-detail-panel.tsx` bridge has been removed
after `rg` confirmed no runtime imports remained. `IncidentDetailPanel` UI,
tracking URL construction, status update request body/error parsing, viewer
read-only status choices, close-warning decisions, and `409` reload behavior
belong under `widgets/dashboard-map`.

### Demo API contract summary

These are the main API paths used by the current demo flow:

- `GET /health`: API health check.
- `POST /api/incidents`: creates an incident idempotently by `clientRequestId`
  and returns the internal `id` plus display `caseNumber`.
- `GET /api/incidents/recent?since=<cursor>&limit=50`: polling fallback for
  new incidents and status updates.
- `GET /api/incidents/:id/tracking?sessionId=<mobile-session-id>`: mobile
  reporter-owned tracking view.
- `GET /api/incidents/:id/tracking?role=<role>&category=<category>`: admin
  scoped detail view, including read-only `viewer`.
- `PATCH /api/incidents/:id/status`: admin status update with optimistic
  concurrency through `expectedVersion`.
- `GET /api/incidents/map-points`: dashboard/GIS incident markers with
  `caseNumber` and area metadata.
- `GET /api/events?role=<role>&category=<category>`: admin SSE stream.
- `GET /api/contacts` and contact write endpoints: role-scoped emergency
  contact data.
- `GET /api/areas`, `GET /api/areas/resolve-point`,
  `GET /api/areas/:id/contacts`, and `GET /api/areas/:id/incidents`: GIS and
  area lookup data.

UUID stays as the internal API id. User-facing screens should display
`caseNumber` first, then short `id.slice(0, 8)` fallback only when older data has
no case number.

## 4. Verify Before Push

Run backend tests:

```powershell
pnpm test:api
```

Run backend build:

```powershell
pnpm build:api
```

Run frontend build:

```powershell
pnpm build
```


## 4.1 Comment / Docs / FSD-lite Check

Before every commit, confirm:

1. Business rules, fallback logic, role scope, realtime, GIS, and API/DB integration have Thai comments where the reason is not obvious.
2. Flow, API, environment variable, schema, realtime, or GIS changes update the related docs in the same change.
3. New runtime files use FSD-lite placement: `shared/`, `entities/`, `features/`, or `widgets/`.
4. `lib/` is used only as a compatibility bridge. Do not add new runtime implementation there.
5. See [CODE_CONVENTIONS_TH.md](../architecture/CODE_CONVENTIONS_TH.md) and [FSD_LITE_GUIDE.md](../architecture/FSD_LITE_GUIDE.md).

## 5. Health Checks

Frontend:

- [http://localhost:3000](http://localhost:3000)
- [http://localhost:3000/admin](http://localhost:3000/admin)

Backend:

- [http://localhost:4000/health](http://localhost:4000/health)

Database UI:

- [http://localhost:8081](http://localhost:8081)

## 6. Common Problems

### Backend does not start

Check:

- `.env` values
- `docker compose ps`
- port `4000` already in use or not
- `DATABASE_URL` format

Then run:

```powershell
pnpm build:api
```

### Frontend loads but data is empty

Check:

- backend running on `http://localhost:4000`
- browser console / network tab
- DB seeded already

Then verify:

```powershell
curl http://localhost:4000/health
```

### GIS data missing

Check:

- migrations applied through `pnpm db:migrate:areas`
- official boundaries imported previously
- `areas` table contains province/district rows

If needed, re-import:

```powershell
pnpm db:import:boundaries
```

### Realtime alerts do not appear

Check:

- backend running
- SSE endpoint responds: `GET /api/events`
- dashboard page open
- incident creation succeeds
- login role is not `viewer` when testing popup/sound alerts; viewer receives
  passive data refresh only


## 6.1 Cloudflare Tunnel for Vercel Demo

For the Vercel demo, the frontend is deployed on Vercel, but the Fastify API
and PostgreSQL/PostGIS database still run from the local machine through a
Cloudflare tunnel. If the local machine, Docker API, DB, or cloudflared is off,
the Vercel frontend may load but API data will not update.

The Docker local stack runs cloudflared with HTTP/2 because SSE needs a
long-lived stream and the previous QUIC quick tunnel showed intermittent stream
timeout/cancel behavior.

Required Vercel environment variables:

```env
NEXT_PUBLIC_EMERGENCY_API_EXTERNAL_URL=https://<your-tunnel>.trycloudflare.com
NEXT_PUBLIC_EMERGENCY_EVENTS_EXTERNAL_URL=https://<your-tunnel>.trycloudflare.com
```

REST and polling on Vercel use the same-origin rewrite path `/emergency-api` to
avoid browser CORS issues. SSE still uses the configured events tunnel URL
directly through EventSource.

Do not set `EMERGENCY_API_INTERNAL_URL` on Vercel to `localhost`,
`127.0.0.1`, or `http://api:4000`; that value is only for local Docker
networking.

Smoke checks:

```powershell
curl https://<your-tunnel>.trycloudflare.com/health
curl https://smart-emergency-test.vercel.app/emergency-api/health
```

Current broad Vercel smoke checklist:

- Mobile/iPhone `Call` creates an incident and does not show
  `failed to start incident`.
- Admin `super_admin` or matching `agency_admin` receives one alert, one queue
  item, and one map marker for the same case.
- Alert, queue, and map all open the same detail panel.
- `viewer` can see scoped dashboard/queue/map/detail data but cannot update
  status and must not receive popup, sound, or actionable notification.
- Mobile/admin user-facing incident numbers show `caseNumber`, not the full
  UUID.
- Contacts, GIS, Reports print, and Settings open without crashing.

Latest detail-flow smoke after `7ed88fd`:

- Alert, queue, and map/detail wiring opened the same case on the Vercel test
  dashboard.
- `viewer` could open scoped detail but had no status dropdown, update button,
  or actionable status choices.
- Matching `agency_admin` could update only to the next workflow status.
- `super_admin` still saw forward and backward status choices.
- Backward status transitions still required a note.
- Closing a case without a summary still opened the confirmation dialog.
- Successful status update reloaded tracking, refreshed dashboard data, and
  showed the success toast.
- The detail panel UI now lives under `widgets/dashboard-map`; the legacy
  `components/admin/incident-detail-panel.tsx` path remains as a bridge.

## 7. Current Known Limits

- Auth is still mock-based in the app layer
- `admin/users` is a placeholder page under `widgets/admin-users`; real user CRUD waits for the team auth contract
- Audit logging and rate limiting are not done yet

## 8. Handoff Flow

Before ending a work session:

1. Update local `CODEX_HANDOFF.md` if you use Codex handoff between sessions
2. Update [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)

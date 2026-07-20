# Emergency API

Backend microservice for the Smart Emergency dashboard.

For the frontend/backend contract, read
[`docs/api/API_CONTRACT.md`](../../docs/api/API_CONTRACT.md).

## Why This Is Separate From Next.js

Next.js can serve APIs, but this project is learning toward microservices. Keeping `emergency-api` as its own package gives the backend its own runtime, dependencies, database connection, routes, and deployment boundary.

Current boundary:

- Next.js app: user interface
- `emergency-api`: emergency data API and alert events
- PostgreSQL/PostGIS: database and geospatial checks

## Why Docker Runs The DB

Docker makes the database reproducible. Every developer can run the same PostgreSQL/PostGIS version without installing PostgreSQL directly on Windows.

```powershell
pnpm db:up
pnpm db:down
```

## Why PostGIS

The system needs polygon areas and point-in-polygon checks. PostGIS gives reliable geospatial functions, so the backend does not need to hand-roll geometry math.

Example:

```sql
ST_Contains(area.polygon, contact.location)
```

## Run

From the repo root:

```powershell
pnpm install
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev:api
```

API base URL:

```text
http://localhost:4000
```

Health check:

```text
GET /health
```

## First Modules

- `contacts`: add, edit, delete phone/contact records.
- `areas`: store polygon boundaries and check whether a point is inside.
- `incidents`: store emergency cases, call result, status tracking, location history, and map marker data.
- `events`: server-sent events for dashboard alerts, status updates, and passive viewer refresh.

## Current Endpoints

```text
GET    /api/contacts
POST   /api/contacts
PUT    /api/contacts/:id
DELETE /api/contacts/:id

GET    /api/areas
POST   /api/areas
PUT    /api/areas/:id
DELETE /api/areas/:id
GET    /api/areas/resolve-point
GET    /api/areas/:id/contacts
GET    /api/areas/:id/incidents
POST   /api/areas/:id/contains-point

GET    /api/incidents
POST   /api/incidents
GET    /api/incidents/recent
GET    /api/incidents/history
GET    /api/incidents/:id
GET    /api/incidents/:id/tracking
GET    /api/incidents/:id/events
PATCH  /api/incidents/:id/status
PUT    /api/incidents/:id/call
POST   /api/incidents/:id/share-attempts
GET    /api/incidents/map-points

GET    /api/reports/summary
GET    /api/events

GET    /api/reference/categories
GET    /api/reference/provinces
GET    /api/reference/districts
GET    /api/reference/share-channels

GET    /api/admin/organization-settings
PUT    /api/admin/organization-settings
GET    /api/admin/share-channels
PUT    /api/admin/share-channels
```

## Current Runtime Flows

### Incident identity

`id` is still the internal UUID used in route paths and database relations.
User-facing screens should display `caseNumber` when available, for example
`EMS-20260706-0001`, and fall back only to a short `id.slice(0, 8)` for legacy
records.

Case numbers are generated in `POST /api/incidents` from
`incident_case_counters`, scoped by category and Bangkok date. The same
`clientRequestId` returns the original incident and case number instead of
creating a duplicate case.

### Realtime

Admin opens `GET /api/events` with demo scope from `x-admin-role` /
`x-admin-category` headers or `role` / `category` query parameters. The stream
publishes `incident.created` and `incident.status_updated`.

The frontend also polls `GET /api/incidents/recent?since=...` as a fallback for
Cloudflare/browser cases where SSE connects but event delivery is unreliable.
Clients de-duplicate by incident id and status version.

### Role scope

Current auth is a demo boundary, not production authentication.

- `super_admin` can see/manage all categories.
- `agency_admin` can see/manage only its own category.
- `viewer` is category-scoped and read-only. It can receive passive refreshes,
  but cannot receive actionable alerts or write contacts/call status.

### Vercel test deployment

The Vercel frontend points to this local Fastify API through a Cloudflare
tunnel. If the local machine, Docker API, database, or tunnel is stopped, the
Vercel frontend can still load but API data will be unavailable.

Current test API domain used by the team is:

```text
https://emer-api.scgs-ai.com
```

Do not put real tunnel tokens, real phone numbers, or private recipients in
this repository. Use environment variables or admin settings instead.

## Learning Path

1. Learn CRUD with `contacts`.
2. Learn geospatial data with `areas`.
3. Learn dashboard map data with `incidents/map-points`.
4. Learn realtime UI updates with `/api/events`.
5. Connect the Next.js dashboard to this API.

## Dev Seed Data

Seed data moves frontend mock examples into the database so the frontend can read real API data.

```powershell
pnpm db:migrate
pnpm db:seed
```

The seed is safe to run more than once because it uses fixed UUIDs and `ON CONFLICT`.

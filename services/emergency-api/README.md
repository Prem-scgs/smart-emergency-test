# Emergency API

Backend microservice for the Smart Emergency dashboard.

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
pnpm db:migrate:contacts
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
- `incidents`: store emergency logs and expose map marker data.
- `events`: server-sent events for future dashboard alert sounds.

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
GET    /api/areas/:id/contacts
POST   /api/areas/:id/contains-point

GET    /api/incidents
POST   /api/incidents
GET    /api/incidents/map-points
GET    /api/events
```

## Learning Path

1. Learn CRUD with `contacts`.
2. Learn geospatial data with `areas`.
3. Learn dashboard map data with `incidents/map-points`.
4. Learn realtime UI updates with `/api/events`.
5. Connect the Next.js dashboard to this API.

## Dev Seed Data

Seed data moves frontend mock examples into the database so the frontend can read real API data.

```powershell
pnpm db:migrate:contacts
pnpm db:seed
```

The seed is safe to run more than once because it uses fixed UUIDs and `ON CONFLICT`.

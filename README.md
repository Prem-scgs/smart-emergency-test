# Smart Emergency

Smart Emergency is a Next.js + Fastify + PostgreSQL/PostGIS project for emergency reporting, admin operations, GIS boundary lookup, and realtime incident alerts.

## Current Architecture

- `app/`, `components/`, `lib/`: Next.js frontend for admin and mobile-style flows
- `services/emergency-api`: Fastify backend service
- `docker-compose.yml`: PostgreSQL/PostGIS and DbGate
- `areas`: official Thailand province/district boundaries plus future editable response zones

Current runtime split:

- Frontend: `http://localhost:3000`
- Emergency API: `http://localhost:4000`
- DbGate: `http://localhost:8081`

## Main Features Working Now

- Admin dashboard reads real incident/contact data from the backend
- Admin contacts page supports CRUD against PostgreSQL
- GIS page loads province/district boundaries and area-scoped contacts/incidents
- Mobile flow can resolve current location, load local emergency contacts, and create incidents
- Realtime incident alerts use Server-Sent Events
- Incident detail endpoint exists at `GET /api/incidents/:id`

## Quick Start

1. Install dependencies

```powershell
pnpm install
```

2. Copy environment template if needed

```powershell
copy .env.example .env
```

3. Start database

```powershell
pnpm db:up
docker compose up -d dbgate
```

4. Apply migrations and seed local data

```powershell
pnpm db:migrate:contacts
pnpm db:migrate:mock
pnpm db:migrate:areas
pnpm db:migrate:call-logs
pnpm db:migrate:reporters
pnpm db:migrate:category-master
pnpm db:migrate:location-codes
pnpm db:seed
```

5. Start backend

```powershell
pnpm dev:api
```

6. Start frontend in another terminal

```powershell
pnpm dev
```

## Makefile Shortcuts

If `make` is available in your shell:

```powershell
make db-ui
make db-migrate
make db-seed
make api
make web
```

In Windows PowerShell without `make`, use the `pnpm` commands directly.

## Verification Commands

Backend tests:

```powershell
pnpm test:api
```

Backend build:

```powershell
pnpm build:api
```

Frontend build:

```powershell
pnpm build
```

## Important Local URLs

- Frontend: [http://localhost:3000](http://localhost:3000)
- Admin login: [http://localhost:3000/admin](http://localhost:3000/admin)
- API health: [http://localhost:4000/health](http://localhost:4000/health)
- DbGate: [http://localhost:8081](http://localhost:8081)

## Environment Variables

See [.env.example](.env.example)

- `PORT`
- `DATABASE_URL`
- `CORS_ORIGIN`

The backend validates these values on startup.

## Important Files

- Production tracking: [PRODUCTION_CHECKLIST.md](docs/operations/PRODUCTION_CHECKLIST.md)
- Local operations guide: [RUNBOOK.md](docs/operations/RUNBOOK.md)

## Current Caveats

- Admin auth is still mock-based and will be integrated with the team auth system later.
- `admin/users` is still mock-backed.
- Audit logging and rate limiting are still pending.

## Repository Notes

- Active branch for this work: `Prem(scgs)-emergencyV0`
- Do not push directly to `main`
- Ask Prem before changing git identity or pushing

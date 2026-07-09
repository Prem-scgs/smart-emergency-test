# Smart Emergency

Smart Emergency is a Next.js + Fastify + PostgreSQL/PostGIS project for emergency reporting, admin operations, GIS boundary lookup, and realtime incident alerts.

## Current Architecture

- `app/`: Next.js route shells for admin and mobile entry points
- `widgets/`: page-level admin/mobile UI owners such as dashboard, GIS, contacts, reports, settings, login, and mobile emergency flow
- `features/`, `entities/`, `shared/`: FSD-lite feature logic, domain helpers/types, shared auth/i18n/reference/API utilities
- `components/ui`: reusable UI primitives only; avoid adding feature/runtime logic here
- `lib/`: test and wiring checks only; do not add new runtime implementation here
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
pnpm db:migrate
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

## Migration Notes

Use `pnpm db:migrate` as the source-of-truth migration command for local
development. It applies the base mock-to-real transition migrations, the
target schema migrations `013`-`015`, incident tracking, share channels,
system settings, incident accuracy, and incident case number migrations in
order.

The old mock tables `dashboard_snapshots`, `app_users`, and
`user_emergency_contacts` are intentionally dropped by migration `015`; current
dashboard, mobile tracking, and share-location flows read from real incident,
contact, area, and settings tables instead.

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

- Code conventions: [CODE_CONVENTIONS_TH.md](docs/architecture/CODE_CONVENTIONS_TH.md)
- FSD-lite guide: [FSD_LITE_GUIDE.md](docs/architecture/FSD_LITE_GUIDE.md)
- Production tracking: [PRODUCTION_CHECKLIST.md](docs/operations/PRODUCTION_CHECKLIST.md)
- Local operations guide: [RUNBOOK.md](docs/operations/RUNBOOK.md)

## Current Caveats

- Admin auth is still demo/local-storage/header based and will be integrated with the team auth system later.
- `admin/users` is an explicit placeholder under `widgets/admin-users`; real user CRUD waits for the team auth contract.
- Audit logging exists for important write actions; rate limiting exists where currently implemented, but production shared-store limits still need review before real deployment.


## Before Commit Checklist

Before committing, check:

- Did relevant build/tests pass?
- If business logic changed, did you add or update Thai comments where they explain non-obvious rules?
- If flow/API/env/schema/realtime/GIS changed, did you update docs in the same change?
- Are new files placed in the correct FSD-lite layer instead of adding runtime code to `lib/`?
- If a `lib/` file is touched, is it a test/wiring check rather than runtime implementation?

## Repository Notes

- Active branch for this work: `Prem(scgs)-emergencyV0`
- Do not push directly to `main`
- Ask Prem before changing git identity or pushing

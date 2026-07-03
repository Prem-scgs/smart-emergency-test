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

## 7. Current Known Limits

- Auth is still mock-based in the app layer
- `admin/users` is still mock-backed
- Audit logging and rate limiting are not done yet

## 8. Handoff Flow

Before ending a work session:

1. Update local `CODEX_HANDOFF.md` if you use Codex handoff between sessions
2. Update [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)

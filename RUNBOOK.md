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
pnpm db:migrate:contacts
pnpm db:migrate:mock
pnpm db:migrate:areas
pnpm db:migrate:call-logs
pnpm db:migrate:reporters
pnpm db:migrate:category-master
pnpm db:migrate:location-codes
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
pnpm db:migrate:contacts
pnpm db:migrate:mock
pnpm db:migrate:areas
pnpm db:migrate:call-logs
pnpm db:migrate:reporters
pnpm db:migrate:category-master
pnpm db:migrate:location-codes
pnpm db:seed
```

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

1. Update [CODEX_HANDOFF.md](D:\testwork_Fullstack(SCSG)\smart-emergency\CODEX_HANDOFF.md)
2. Update [PRODUCTION_CHECKLIST.md](D:\testwork_Fullstack(SCSG)\smart-emergency\PRODUCTION_CHECKLIST.md)
3. Update [SESSION_LOG.md](D:\testwork_Fullstack(SCSG)\smart-emergency\SESSION_LOG.md)

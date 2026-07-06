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

For the Vercel demo, the frontend must point to the public Cloudflare Tunnel URL for the local Fastify API. The Docker local stack runs cloudflared with HTTP/2 because SSE needs a long-lived stream and the previous QUIC quick tunnel showed intermittent stream timeout/cancel behavior.

Required Vercel environment variables:

```env
NEXT_PUBLIC_EMERGENCY_API_EXTERNAL_URL=https://<your-tunnel>.trycloudflare.com
NEXT_PUBLIC_EMERGENCY_EVENTS_EXTERNAL_URL=https://<your-tunnel>.trycloudflare.com
```

Do not set EMERGENCY_API_INTERNAL_URL on Vercel to localhost, 127.0.0.1, or http://api:4000; that value is only for local Docker networking.

Smoke checks:

```powershell
curl https://<your-tunnel>.trycloudflare.com/health
curl https://smart-emergency-test.vercel.app/emergency-api/health
```

## 7. Current Known Limits

- Auth is still mock-based in the app layer
- `admin/users` is still mock-backed
- Audit logging and rate limiting are not done yet

## 8. Handoff Flow

Before ending a work session:

1. Update local `CODEX_HANDOFF.md` if you use Codex handoff between sessions
2. Update [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)

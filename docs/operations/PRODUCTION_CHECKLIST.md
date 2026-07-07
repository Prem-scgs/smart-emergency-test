# Production Readiness Checklist

Use this file to track production-readiness work without touching the auth implementation owned by the team.

## Current Focus

- Current phase: `Phase 5 - Realtime and Demo Flow Stability`
- Current task: `FSD-lite incident location share helper cleanup is locally verified after 94ce720`
- Next action: `Wait for commit/push instruction, then push to prem only`

## Status Guide

- `[ ]` not started
- `[-]` in progress
- `[x]` done
- `[!]` blocked / waiting on team decision

## Phase 1 - Data Flow and API Completeness

- [x] Remove root `lib/mock-data.ts` from the main runtime layer
- [x] Add `GET /api/incidents/:id`
- [x] Update mobile tracking to read incident detail directly
- [x] Add display case numbers while keeping UUID as internal API id
- [ ] Make mobile/admin/backend use one shared category source
- [x] Make province/district/location lookup use one shared source
- [x] Reduce duplicate fetches for reference categories and locations
- [ ] Confirm all incident creation flows save `provinceCode` and `districtCode`

## Phase 2 - Validation and Stable API Contracts

- [x] Standardize API error response shape
- [-] Validate critical inputs on all write endpoints
- [-] Validate `latitude` / `longitude` / phone / status / category / area codes
- [ ] Review endpoint response fields for consistency
- [x] Document current demo API contract in the runbook

## Phase 3 - Database Readiness

- [x] Review schema against current scope
- [x] Add or confirm needed foreign keys
- [x] Add or confirm needed indexes
- [ ] Verify migrations from a clean database
- [ ] Keep seed data clearly separated from schema changes
- [ ] Write simple backup / restore notes

## Phase 4 - GIS Correctness

- [ ] Verify `resolve-point` in Bangkok
- [ ] Verify `resolve-point` in Chiang Mai
- [ ] Verify `resolve-point` in Phitsanulok
- [ ] Check polygon edge cases
- [ ] Confirm incidents and contacts map to the correct area codes
- [ ] Separate official boundaries from editable response zones
- [ ] Avoid loading full geometry where it is not needed

## Phase 5 - Realtime and Dashboard Stability

- [-] Verify admin receives new incident notifications reliably
- [-] Verify SSE reconnect behavior
- [x] Add REST polling fallback for `/api/incidents/recent`
- [x] Prevent duplicate notifications across SSE and polling by incident id / status version
- [x] Keep `viewer` passive: scoped live refresh only, no popup/sound/actionable notifications
- [ ] Define which alert severities should play sound
- [ ] Complete loading / empty / error states in main admin pages
- [x] Verify role-scoped filtering across dashboard widgets

## Phase 6 - Logging, Security, and Ops

- [x] Add request logging
- [x] Add error logging
- [x] Add audit logging for important write actions
- [ ] Configure CORS intentionally
- [-] Add rate limiting where needed
- [x] Add environment validation
- [x] Create `.env.example`
- [x] Update README with current setup flow
- [x] Add a short runbook for local/dev troubleshooting

## Phase 7 - Auth Integration Readiness

- [ ] Keep permission logic centralized
- [ ] Define expected user/session shape for future auth integration
- [ ] Mark which endpoints need which role
- [ ] Prepare backend to accept user context from headers/token later
- [!] Wait for team auth system details before integrating

## Verification Log

- Latest known verified items:
  - Vercel test demo passed after Cloudflare tunnel CORS/rewrite fix: iPhone mobile Call created a new incident and Admin saw it through polling fallback
  - `020_incident_case_number.sql` added `caseNumber` display ids and was verified on Vercel test flow
  - Viewer role was narrowed to read-only/passive realtime behavior
  - `pnpm db:migrate:db-readiness` passed
  - DB query confirmed new foreign keys, check constraints, and indexes exist
  - `pnpm test:api` passed
  - `pnpm build:api` passed
  - `pnpm build` passed
  - dashboard and GIS pages loaded
  - realtime incident event flow emitted successfully
  - FSD-lite helper slices completed and verified on Vercel test through `036f815`: `shared/config`, `shared/realtime`, `entities/incident`, `entities/contact`, `entities/area`, `features/incident-alert`, and `widgets/dashboard-map`
  - Broad Vercel smoke after `ef4f5b0` passed: mobile incident create, duplicate request guard, polling fallback, mobile tracking case number, viewer read-only detail/status guard, dashboard map-points case number, contacts/incident viewer scope, call result update, and main admin pages
  - UI smoke was checked by เปรม after deploy: admin popup/detail/map/report-print paths passed
  - Dashboard widget extraction passed on Vercel test after `1cf7f87`: dashboard data hook, detail controller, selected-area bounds, queue/map/detail wiring, and iPhone mobile create -> admin alert path
  - IncidentQueue slice passed on Vercel test after `63c9b17`: queue implementation moved under `widgets/dashboard-map`, legacy component path is a bridge, and viewer/detail/queue behavior remained correct
  - IncidentMap slice passed on Vercel test after `36c87b3`: map implementation moved under `widgets/dashboard-map`, legacy component path is a bridge, and marker/popup/selected-area behavior remained correct
  - IncidentDetailPanel helper/controller slice passed on Vercel test after `2ddad8f`: viewer detail read-only, agency next-status update, super admin forward/backward choices, backward note guard, close-without-summary confirmation, alert-to-detail, and status success reload/toast flow were verified
  - IncidentDetailPanel UI shell slice passed on Vercel test after `7ed88fd`: detail panel implementation moved under `widgets/dashboard-map`, legacy component path is a bridge, and alert/queue/map detail flows remained correct
  - Types Wave 4 passed on Vercel test after `9c81f63`: contact, call, and location types moved to canonical FSD-lite owners while `lib/types.ts` remained a compatibility re-export layer
  - Root mock data cleanup passed on Vercel test after `465d5d9`: `lib/mock-data.ts` was removed and the remaining legacy mock profile moved under `_legacy`
  - Types Wave 5 passed on Vercel test after `f918f0f`: legacy user profile types moved under `_legacy`, and `lib/types.ts` now has no local type definitions
  - Type bridge cleanup locally verified after `77a2ee0`: `lib/types.ts` was removed after `rg` confirmed no `@/lib/types` imports remained, so source now uses canonical type owners directly
  - Alert preferences cleanup locally verified after `d142b9d`: `features/incident-alert` now owns admin alert preferences while keeping the same localStorage key and browser event contract
  - Legacy location share cleanup locally verified after `4de250e`: root `lib/location-share.ts` moved to `_legacy/lib/location-share.ts`, production incident location sharing remains on `lib/incident-location-share.ts`, and the targeted tests/build passed
  - Reference category cleanup locally verified after `373f2da`: category reference loaders and admin/mobile category display helpers moved from root `lib/` to `shared/reference`, and targeted tests/build passed
  - Reference location cleanup passed on Vercel test after `cf7b08c`: province/district reference loaders, lookup maps, and display helpers moved from root `lib/` to `shared/location`
  - Mobile incident helper cleanup passed on Vercel test after `94ce720`: mobile incident payload builders, GPS lock status helpers, and reporter session/phone storage moved from root `lib/` to `features/mobile-incident`
  - Incident location share helper cleanup locally verified after `94ce720`: production incident location share helpers moved from root `lib/` to `features/location-sharing`

Vercel test note:

- The test frontend is deployed on Vercel, but the Fastify API and PostgreSQL/PostGIS database still run from เปรม's machine through the Cloudflare tunnel. If that machine, Docker API, DB, or cloudflared is off, the Vercel frontend can load while live API data fails.

## Notes

- Do not push auth implementation into this checklist unless the team hands off that scope.
- Update `Current Focus` and the checkbox state before ending each session.

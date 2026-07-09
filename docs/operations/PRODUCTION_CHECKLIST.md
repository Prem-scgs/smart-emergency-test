# Production Readiness Checklist

Use this file to track production-readiness work without touching the auth implementation owned by the team.

## Current Focus

- Current phase: `Phase 5 - Realtime and Demo Flow Stability`
- Current task: `Final cleanup/refactor Wave 1 is pushed to Vercel test`
- Next action: `Run Wave 2 docs status cleanup, then commit/push it to prem/main`

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
  - IncidentQueue slice passed on Vercel test after `63c9b17`: queue implementation moved under `widgets/dashboard-map`, the old component bridge was later removed, and viewer/detail/queue behavior remained correct
  - IncidentMap slice passed on Vercel test after `36c87b3`: map implementation moved under `widgets/dashboard-map`, the old component bridge was later removed, and marker/popup/selected-area behavior remained correct
  - IncidentDetailPanel helper/controller slice passed on Vercel test after `2ddad8f`: viewer detail read-only, agency next-status update, super admin forward/backward choices, backward note guard, close-without-summary confirmation, alert-to-detail, and status success reload/toast flow were verified
  - IncidentDetailPanel UI shell slice passed on Vercel test after `7ed88fd`: detail panel implementation moved under `widgets/dashboard-map`, the old component bridge was later removed, and alert/queue/map detail flows remained correct
  - Types Wave 4 passed on Vercel test after `9c81f63`: contact, call, and location types moved to canonical FSD-lite owners while `lib/types.ts` remained a compatibility re-export layer
  - Root mock data cleanup passed on Vercel test after `465d5d9`: `lib/mock-data.ts` was removed; the later old mock profile files were removed during final cleanup
  - Types Wave 5 passed on Vercel test after `f918f0f`: old user profile types were isolated at the time, then removed during final cleanup after production flow no longer used them
  - Type bridge cleanup locally verified after `77a2ee0`: `lib/types.ts` was removed after `rg` confirmed no `@/lib/types` imports remained, so source now uses canonical type owners directly
  - Alert preferences cleanup locally verified after `d142b9d`: `features/incident-alert` now owns admin alert preferences while keeping the same localStorage key and browser event contract
  - Old location share cleanup locally verified after `4de250e`, then removed during final cleanup after production incident location sharing moved to `features/location-sharing`
  - Reference category cleanup locally verified after `373f2da`: category reference loaders and admin/mobile category display helpers moved from root `lib/` to `shared/reference`, and targeted tests/build passed
  - Reference location cleanup passed on Vercel test after `cf7b08c`: province/district reference loaders, lookup maps, and display helpers moved from root `lib/` to `shared/location`
  - Mobile incident helper cleanup passed on Vercel test after `94ce720`: mobile incident payload builders, GPS lock status helpers, and reporter session/phone storage moved from root `lib/` to `features/mobile-incident`
  - Incident location share helper cleanup passed on Vercel test after `1f33c67`: production incident location share helpers moved from root `lib/` to `features/location-sharing`
  - Mobile app shell cleanup locally verified: top-level `MobileApp` moved from `components/mobile/mobile-app.tsx` to `widgets/mobile-emergency`; child mobile screens were moved in later slices
  - Mobile tracking/history screen cleanup locally verified: `IncidentTrackingScreen` and `IncidentHistoryScreen` moved from `components/mobile` to `widgets/mobile-emergency`
  - Incident location share card cleanup locally verified: `IncidentLocationShareCard` moved from `components/mobile` to `features/location-sharing`
  - Remaining mobile UI screen cleanup locally verified: splash, location header, emergency category grid, SOS button, mobile nav, and incident selection screen moved from `components/mobile` to `widgets/mobile-emergency`
  - Notification context cleanup pushed after `efcf4db`: `features/incident-alert` now owns `NotificationProvider` and `useNotifications`
  - Admin SSE hook cleanup pushed after `299daa0`: `features/incident-alert` now owns the admin `useSse` hook while `shared/realtime` still owns pure payload validators and polling constants
  - Auth context cleanup passed on Vercel test after `3741306`: `shared/auth` now owns `AuthProvider`, `useAuth`, agency registry data, and restore guards; `operator` stale sessions are rejected and the supported admin roles are `super_admin`, `agency_admin`, and `viewer`
  - Admin i18n cleanup pushed after `193406f`: `shared/i18n/admin` now owns `AdminI18nProvider`, `useAdminI18n`, language preference constants, and split Thai/English dictionaries while preserving the existing preference key and language-change event
  - IncidentStatusTimeline cleanup locally verified: timeline UI moved from `components/admin` to `widgets/dashboard-map/ui`, `IncidentDetailPanel` now imports it from the widget-local path, and targeted tests/build passed
  - Shared utils cleanup locally verified: `cn` moved from root `lib/utils.ts` to `shared/utils`, all imports now use `@/shared/utils`, and the shadcn `components.json` alias points to the new owner
  - Admin shell extraction locally verified: admin dashboard shell, notification bell/center, navigation metadata, role badge metadata, and organization settings wiring moved under `widgets/admin-shell`
  - Admin GIS boundary map extraction locally verified: `GisBoundaryMap` and `GisBoundary` moved under `widgets/admin-gis`, GIS page imports the widget owner, and targeted GIS/area/dashboard/API tests passed
  - Admin call logs page extraction locally verified: route shell now imports `widgets/admin-call-logs`, while call logs UI, filters, pagination, CSV/PDF export, and print snapshot logic live under the widget owner
  - Admin reports page extraction locally verified: route shell now imports `widgets/admin-reports`, while reports UI, range filter, KPI cards, charts/tabs, CSV/PDF export, and print snapshot logic live under the widget owner
  - Admin settings page extraction locally verified: route shell now imports `widgets/admin-settings`, while personal preferences, organization settings, share-channel settings, and system health snapshot UI live under the widget owner
  - Admin contacts page extraction locally verified: route shell now imports `widgets/admin-contacts`, while contacts UI, role-scoped filters, CRUD form, location selector, and delete confirmation flow live under the widget owner
  - Admin login page extraction locally verified: route shell now imports `widgets/admin-login`, while login UI, role selector, agency selector, and login submit flow live under the widget owner
  - Admin GIS page extraction locally verified: route shell now imports `widgets/admin-gis`, while province/district loading, area filters, sidebars, boundary map composition, contact list, and incident list live under the widget owner
  - Admin users placeholder extraction locally verified: route shell now imports `widgets/admin-users`, while the placeholder UI remains explicit that real user CRUD waits for the team auth contract
  - Backend incidents report route split locally verified: `/api/reports/summary` registration moved to `services/emergency-api/src/modules/incidents/report-routes.ts` while `registerIncidentRoutes` still exposes the same public endpoint
  - Backend incidents event route split locally verified: `/api/incidents/:id/events` and `/api/events` moved to `services/emergency-api/src/modules/incidents/event-routes.ts` while SSE behavior and CORS headers remain under `registerIncidentRoutes`
  - Backend incidents status route split locally verified: `PATCH /api/incidents/:id/status` moved to `services/emergency-api/src/modules/incidents/status-routes.ts` while transaction, version conflict, viewer guard, status history, and SSE emit behavior remain unchanged
  - Backend areas route helper split locally verified: area schemas, params, forbidden response, and row mappers moved to `services/emergency-api/src/modules/areas/route-helpers.ts` while GIS read/write endpoint contracts remain unchanged
  - Backend contacts route helper split locally verified: contact schemas, params, query parsing, scope mismatch helper, forbidden response, and row mapper moved to `services/emergency-api/src/modules/contacts/route-helpers.ts` while CRUD permission behavior remains unchanged
  - Final cleanup Wave 1 pushed after `65d8b1b`: added the missing `010_contact_coverage_type.sql` migration for the generated contact coverage column and aligned `Makefile` `db-migrate`/`db-reset` flows with migrations `019` and `020`; `pnpm --filter emergency-api build`, `pnpm test:api`, and `git diff --check` passed.

Vercel test note:

- The test frontend is deployed on Vercel, but the Fastify API and PostgreSQL/PostGIS database still run from เปรม's machine through the Cloudflare tunnel. If that machine, Docker API, DB, or cloudflared is off, the Vercel frontend can load while live API data fails.

## Notes

- Do not push auth implementation into this checklist unless the team hands off that scope.
- Update `Current Focus` and the checkbox state before ending each session.

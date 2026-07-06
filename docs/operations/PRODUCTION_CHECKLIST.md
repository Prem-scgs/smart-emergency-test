# Production Readiness Checklist

Use this file to track production-readiness work without touching the auth implementation owned by the team.

## Current Focus

- Current phase: `Phase 5 - Realtime and Demo Flow Stability`
- Current task: `FSD-lite helper slices and broad Vercel smoke test completed`
- Next action: `Choose the next scope: pause refactor for demo handoff, document API/backup contracts, or plan a larger component/domain extraction`

## Status Guide

- `[ ]` not started
- `[-]` in progress
- `[x]` done
- `[!]` blocked / waiting on team decision

## Phase 1 - Data Flow and API Completeness

- [-] Replace remaining main-flow mock usage with DB/API data
- [x] Add `GET /api/incidents/:id`
- [x] Update mobile tracking to read incident detail directly
- [x] Add display case numbers while keeping UUID as internal API id
- [ ] Make mobile/admin/backend use one shared category source
- [ ] Make province/district/location lookup use one shared source
- [x] Reduce duplicate fetches for reference categories and locations
- [ ] Confirm all incident creation flows save `provinceCode` and `districtCode`

## Phase 2 - Validation and Stable API Contracts

- [x] Standardize API error response shape
- [-] Validate critical inputs on all write endpoints
- [-] Validate `latitude` / `longitude` / phone / status / category / area codes
- [ ] Review endpoint response fields for consistency
- [ ] Document current API contract in repo docs

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
- [ ] Verify role-scoped filtering across dashboard widgets

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

## Notes

- Do not push auth implementation into this checklist unless the team hands off that scope.
- Update `Current Focus` and the checkbox state before ending each session.

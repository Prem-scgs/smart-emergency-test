# Production Readiness Checklist

Use this file to track production-readiness work without touching the auth implementation owned by the team.

## Current Focus

- Current phase: `Phase 3 - Database Readiness`
- Current task: `Harden schema with foreign keys, DB-level checks, and list-query indexes`
- Next action: `Decide whether to verify from a clean reset next or write backup/restore notes first`

## Status Guide

- `[ ]` not started
- `[-]` in progress
- `[x]` done
- `[!]` blocked / waiting on team decision

## Phase 1 - Data Flow and API Completeness

- [-] Replace remaining main-flow mock usage with DB/API data
- [x] Add `GET /api/incidents/:id`
- [x] Update mobile tracking to read incident detail directly
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

- [ ] Verify admin receives new incident notifications reliably
- [ ] Verify SSE reconnect behavior
- [ ] Prevent duplicate notifications
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
  - `pnpm db:migrate:db-readiness` passed
  - DB query confirmed new foreign keys, check constraints, and indexes exist
  - `pnpm test:api` passed
  - `pnpm build:api` passed
  - `pnpm build` passed
  - dashboard and GIS pages loaded
  - realtime incident event flow emitted successfully

## Notes

- Do not push auth implementation into this checklist unless the team hands off that scope.
- Update `Current Focus` and the checkbox state before ending each session.

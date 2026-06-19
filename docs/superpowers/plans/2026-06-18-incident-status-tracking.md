# Incident Status Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mock Mobile tracking with Admin-controlled case status, timeline, explicit location updates, and one SSE data flow.

**Architecture:** PostgreSQL stores current incident state plus append-only status/location history. Fastify validates transitions and publishes SSE signals; Admin manages a case queue/detail panel, while Mobile restores cases by reporter session and tracks updates. Keep the simulated call screen temporarily, but never persist its timer or visual connection state as real call facts.

**Tech Stack:** Next.js 16, React, Fastify, TypeScript, PostgreSQL/PostGIS, SSE, node:test

**Design:** `docs/superpowers/specs/2026-06-18-incident-status-tracking-design.md`

---

### Task 1: Tracking database migration

**Files:**
- Create: `services/emergency-api/db/migrations/016_incident_tracking.sql`
- Modify: `package.json`
- Modify: `Makefile`

- [x] Add `client_request_id`, `dialed_phone`, and `status_version` to `incidents`; make `client_request_id` unique when present.
- [x] Create `incident_status_history` with incident FK, from/to status, note, admin identity/role, version, and backend timestamp.
- [x] Create `incident_location_history` with incident FK, coordinates, PostGIS point, accuracy, source, and backend timestamp.
- [x] Add indexes for incident timeline and latest-location reads.
- [x] Add `pnpm db:migrate:incident-tracking` and wire it into Makefile migration flows.
- [x] Apply migration and verify columns, constraints, indexes, and tables with read-only SQL queries.

### Task 2: Status transition domain rules

**Files:**
- Create: `services/emergency-api/src/modules/incidents/status-workflow.ts`
- Create: `services/emergency-api/src/modules/incidents/status-workflow.test.ts`

- [x] Write failing tests for the ordered statuses: `reported`, `acknowledged`, `coordinating`, `dispatched`, `on_scene`, `closed`.
- [x] Test that `agency_admin` moves forward only and `super_admin` may move backward.
- [x] Test required backward reason and required close summary.
- [x] Implement a pure validator returning either an accepted transition or a structured API error.
- [x] Run the focused test and `pnpm test:api`.

### Task 3: Idempotent incident creation and dialed phone

**Files:**
- Modify: `lib/mobile-incident.ts`
- Modify: `lib/mobile-incident.test.ts`
- Modify: `services/emergency-api/src/modules/incidents/routes.ts`
- Modify: `services/emergency-api/src/modules/incidents/routes.test.ts`

- [x] Write failing tests proving `clientRequestId` and `dialedPhone` are sent and persisted.
- [x] Make duplicate `clientRequestId` return the existing incident instead of inserting another.
- [x] Insert the initial `reported` status-history row and initial location-history row in the same transaction as incident creation.
- [x] Continue emitting `incident.created` only after the transaction succeeds.
- [x] Verify retries cannot create duplicate cases.

### Task 4: Tracking, status, and location APIs

**Files:**
- Modify: `services/emergency-api/src/modules/incidents/routes.ts`
- Modify: `services/emergency-api/src/modules/incidents/routes.test.ts`
- Modify: `services/emergency-api/src/events.ts`

- [x] Add `GET /api/incidents/:id/tracking` with reporter-session ownership or Admin scope validation.
- [x] Add `PATCH /api/incidents/:id/status` using `expectedVersion` and a DB transaction.
- [x] Return `409 INCIDENT_STATUS_CONFLICT` when another Admin changed the case first.
- [ ] Add `POST /api/incidents/:id/locations`; verify reporter session, insert history, update incident point, and resolve province/district with PostGIS.
- [ ] Emit `incident.status_updated` and `incident.location_updated` only after commits.
- [ ] Test role scope, transitions, required notes, concurrency, ownership, and SSE payloads.

### Task 5: Consolidate realtime onto one SSE client

**Files:**
- Modify: `lib/use-sse.ts`
- Modify: `lib/use-sse.test.ts`
- Modify: `lib/notification-context.tsx`
- Modify: `components/admin/admin-layout-client.tsx`
- Remove after call-site migration: `lib/use-websocket.ts`
- Remove after call-site migration: `lib/use-websocket.test.ts`

- [ ] Fix the current SSE test import and add mappings for created/status/location events.
- [ ] Make NotificationProvider the single owner of the Admin SSE connection.
- [ ] Remove the second `useSse` call from AdminLayoutClient.
- [ ] Migrate all imports, verify no `useWebSocket` call remains, then request Prem's confirmation before deleting obsolete files.
- [ ] Verify one browser tab creates one EventSource connection and reconnect triggers authoritative refetch.

### Task 6: Mobile call and real tracking flow

**Files:**
- Modify: `components/mobile/mobile-app.tsx`
- Modify: `components/mobile/emergency-call-screen.tsx`
- Modify: `components/mobile/incident-tracking-screen.tsx`
- Modify: `components/mobile/incident-history-screen.tsx`
- Modify: `lib/reporter-session.ts`

- [x] Generate and retain a client request ID when Call is tapped.
- [ ] Create the incident with `dialedPhone`, reporter session, and confirmed GPS before call presentation begins.
- [ ] Keep the simulated call screen, but remove call-result choices and reporter-phone input; do not persist its timer/connection label.
- [ ] End Call routes directly to tracking.
- [ ] Replace simulated tracking progression with `GET /tracking` plus SSE/refetch updates.
- [ ] Add explicit `อัปเดตตำแหน่งปัจจุบัน`; request GPS only on tap and POST the update.
- [ ] Make history reopen the authoritative tracking timeline.

### Task 7: Admin incident queue and detail panel

**Files:**
- Create: `components/admin/incident-queue.tsx`
- Create: `components/admin/incident-detail-panel.tsx`
- Create: `components/admin/incident-status-timeline.tsx`
- Modify: `app/admin/(dashboard)/dashboard/page.tsx`
- Modify: `app/admin/(dashboard)/call-logs/page.tsx`
- Modify: `components/admin/incident-map.tsx`

- [ ] Add the left incident queue grouped by new/waiting/in-progress/closed.
- [x] Synchronize queue selection and map marker selection.
- [x] Add the shared detail panel with current status, latest location, transition controls, notes, and timeline.
- [ ] Enforce role-visible actions in UI while keeping backend checks authoritative.
- [ ] Keep the currently selected case open when a new incident arrives; selection preservation is complete, unread indicator remains pending.
- [ ] Reuse the same detail panel from Call Logs.

### Task 8: End-to-end verification and handoff

**Files:**
- Modify: `CODEX_HANDOFF.md`
- Modify: `SESSION_LOG.md`
- Modify as needed: `README.md`, `RUNBOOK.md`

- [ ] Run focused unit/route tests, `pnpm test:api`, `pnpm build:api`, and `pnpm build`.
- [ ] Browser-test: Mobile Call -> Admin queue/alert -> Admin status update -> Mobile timeline.
- [ ] Test two Admins updating one case and confirm stale update receives 409.
- [ ] Test Mobile location update and Admin marker refresh.
- [ ] Confirm no duplicate SSE connection and no simulated call result is persisted.
- [ ] Update handoff/checklist with completed tasks and remaining risks.
- [ ] Before any commit or push, show changed files and proposed Thai commit message to Prem for approval.

## Deferred / Not In This Plan

- Final JWT provider integration; preserve a clean authorization boundary for the team implementation.
- Reading real call connection state or duration from the phone app.
- Continuous background GPS tracking.
- WSS migration.
- Dedicated full-page incident detail route.

# Mobile Status Realtime Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Mobile tracking screen show authoritative case status/history and refresh immediately after an Admin status update.

**Architecture:** Add a reporter-owned, incident-scoped SSE endpoint that emits only status signals for one case. Mobile loads `GET /tracking` on mount, Refresh, SSE open, and matching status events; SSE payloads never replace authoritative tracking data directly.

**Tech Stack:** Fastify, PostgreSQL, SSE/EventSource, React 19, Next.js, TypeScript, Node test runner.

---

### Task 1: Reporter-Scoped Incident SSE

**Files:**
- Modify: `services/emergency-api/src/modules/incidents/routes.test.ts`
- Modify: `services/emergency-api/src/modules/incidents/routes.ts`

- [x] Add failing tests that require registration of `GET /api/incidents/:id/events`, reject a mismatched `sessionId` with 403, and stream `incident.status_updated` only for the requested incident.
- [x] Run `pnpm --filter emergency-api test`; verify RED because the route does not exist.
- [x] Implement ownership lookup before `reply.hijack()`, incident-ID event filtering, heartbeat, and listener cleanup.
- [x] Run the API suite; verify all tests pass.

### Task 2: Authoritative Mobile Tracking Loader

**Files:**
- Create: `lib/mobile-tracking.ts`
- Create: `lib/mobile-tracking.test.ts`
- Modify: `components/mobile/incident-tracking-screen.tsx`

- [x] Add failing tests for encoded tracking/event URLs and validation of the six workflow statuses.
- [x] Run `node --experimental-strip-types --test lib/mobile-tracking.test.ts`; verify RED because the helper is missing.
- [x] Implement the URL/status helper without React dependencies.
- [x] Update `IncidentTrackingScreen` to fetch `/tracking` with reporter session ownership and derive status, history, location, and updated time from the response.
- [x] Open one scoped EventSource while the screen is mounted; refetch on open and `incident.status_updated`, and close it on unmount.
- [x] Make the Refresh button refetch `/tracking`, retaining the last valid state if a request fails.
- [x] Run focused frontend tests and the Next production build.

### Task 3: End-to-End Verification

**Files:** No production changes expected.

- [x] Open a Mobile tracking case and confirm its initial state matches `/tracking`.
- [x] Update that same case from Admin and verify Mobile changes without manual refresh.
- [x] Verify a mismatched reporter session receives 403 and no stream.
- [x] Run API tests, focused frontend tests, API build, Next build, and update handoff/session documents.

# Status CORS and Mobile Feedback Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore Admin status updates and remove reporter-phone entry from Mobile while retaining call-result selection.

**Architecture:** Export tested Fastify CORS methods and allow the methods used by the frontend. Keep `dialed_phone` from incident creation; call feedback sends the selected result with `reporterPhone: null`.

**Tech Stack:** Next.js, React, TypeScript, Fastify, Node test runner, SSE.

---

### Task 1: Allow Browser Status and Call Updates

**Files:**
- Create: `services/emergency-api/src/cors-options.ts`
- Create: `services/emergency-api/src/cors-options.test.ts`
- Modify: `services/emergency-api/src/server.ts`

- [x] Write a failing test asserting CORS includes `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, and `OPTIONS`.
- [x] Run the API test script and verify RED because the CORS options module is missing.
- [x] Export the explicit method list and pass it to Fastify CORS with the existing origin.
- [x] Run the focused test, API suite, and an `OPTIONS` preflight; verify `PATCH` and `PUT` in the response.

### Task 2: Remove Reporter Phone from Mobile Feedback

**Files:**
- Modify: `lib/mobile-incident.test.ts`
- Modify: `lib/mobile-incident.ts`
- Modify: `components/mobile/emergency-call-screen.tsx`
- Modify: `components/mobile/mobile-app.tsx`

- [x] Change the payload test to omit reporter phone and require `reporterPhone: null` while preserving `callStatus`.
- [x] Run `node --experimental-strip-types --test lib/mobile-incident.test.ts`; verify RED because the helper still requires reporter phone.
- [x] Remove reporter-phone props, validation, input, and storage writes; keep the four call-result choices.
- [x] Run the focused Mobile test and Next.js production build; verify GREEN.

### Task 3: Rendered Regression Check

**Files:** No production file changes expected.

- [x] Confirm the API watcher loads the new CORS configuration.
- [x] Update a `reported` Admin incident and verify timeline/queue refresh without `Failed to fetch`.
- [x] End a simulated Mobile call, verify result options remain and no phone input exists, submit, and verify tracking opens.
- [x] Run API tests, focused frontend tests, API TypeScript build, Next.js build, and whitespace review.

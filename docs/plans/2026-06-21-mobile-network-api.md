# Mobile Network API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the Mobile frontend opened from a LAN IP read and write Fastify/PostgreSQL data instead of calling `localhost` on the phone.

**Architecture:** A client-safe helper derives the backend URL from the browser hostname, with `NEXT_PUBLIC_EMERGENCY_API_URL` as a production override. Fastify parses a comma-separated CORS allowlist so desktop and LAN Mobile origins are explicit. Mobile components use the helper for contacts, point-in-polygon, incident history, incident writes, tracking, and SSE.

**Tech Stack:** Next.js 16, React 19, Fastify 5, `@fastify/cors`, TypeScript, Node test runner with `tsx`.

---

### Task 1: Lock network URL and CORS contracts with failing tests

**Files:**
- Create: `lib/emergency-api-url.test.ts`
- Modify: `services/emergency-api/src/config.test.ts`

- [ ] Test `getEmergencyApiBaseUrl` returns `http://172.20.10.4:4000` for a LAN location, `http://localhost:4000` for localhost, and uses a configured `NEXT_PUBLIC_EMERGENCY_API_URL` override.
- [ ] Test `parseConfig` accepts `CORS_ORIGINS=http://localhost:3000,http://172.20.10.4:3000` and returns both origins while preserving existing `CORS_ORIGIN` compatibility.
- [ ] Run focused tests and confirm RED before creating production helper/config logic.

### Task 2: Add one frontend API base URL helper

**Files:**
- Create: `lib/emergency-api-url.ts`
- Modify: `components/mobile/mobile-app.tsx`
- Modify: `components/mobile/incident-history-screen.tsx`
- Modify: `components/mobile/incident-tracking-screen.tsx`

- [ ] Implement `getEmergencyApiBaseUrl(location?, configuredUrl?)`; default server-side host is localhost, browser-side host is `window.location.hostname`, and the API port is `4000`.
- [ ] Replace each Mobile `http://localhost:4000` constant with the helper; do not alter Admin callers.
- [ ] Run helper tests and Mobile focused checks to confirm GREEN.

### Task 3: Support explicit local and LAN CORS origins

**Files:**
- Modify: `services/emergency-api/src/config.ts`
- Modify: `services/emergency-api/src/server.ts`
- Modify: `services/emergency-api/src/modules/incidents/routes.ts`
- Modify: `services/emergency-api/.env.example`
- Create: `services/emergency-api/.env` (ignored, local only)

- [ ] Parse `CORS_ORIGINS` as a comma-separated URL list, falling back to legacy `CORS_ORIGIN`.
- [ ] Configure Fastify CORS and manual SSE headers to echo only an allowed requesting origin.
- [ ] Configure the local ignored `.env` with both `http://localhost:3000` and current Wi-Fi `http://172.20.10.4:3000`; document the variable in `.env.example`.
- [ ] Restart Fastify on port 4000 and verify a request with the LAN Origin receives matching `Access-Control-Allow-Origin`.

### Task 4: Verify through the Mobile URL

**Files:**
- Modify: `CODEX_HANDOFF.md`

- [ ] Run focused helper/config tests and `pnpm build`.
- [ ] Open `http://172.20.10.4:3000`, wait for Mobile home, select an incident category, and verify contacts originate from the database.
- [ ] Record the LAN URL, CORS variable, and verification evidence in handoff; do not commit/push without separate confirmation.

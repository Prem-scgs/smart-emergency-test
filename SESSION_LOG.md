# Session Log

Use this file for short session-by-session notes so the next Codex session or VS Code handoff can continue cleanly.

## Template

Copy this block for each new work session:

```md
## YYYY-MM-DD HH:MM
- Current phase:
- Current task:
- What changed:
  - ...
- Verified:
  - ...
- Open issues:
  - ...
- Next action:
  - ...
```

---

## 2026-06-13 00:00

- Current phase: `Phase 1 - Data flow and API completeness`
- Current task: `Clean up shared reference data flow and remove duplicated incident loading`
- What changed:
  - Moved province/district reference lookups to `areas`-backed APIs.
  - Added location code fields to incidents and contacts.
  - Updated mobile flow to resolve current point into `provinceCode` / `districtCode`.
  - Updated admin/mobile components to use shared reference hooks.
- Verified:
  - `resolve-point` returned correct Bangkok / Pathum Wan codes.
  - contacts filtered by `provinceCode` / `districtCode` returned expected records.
  - builds passed in the latest verified run.
- Open issues:
  - mobile tracking still fetches `/api/incidents` then filters client-side.
  - reference categories and location hooks still fetch duplicate data across components.
  - auth remains mock by design and is waiting on the team system.
- Next action:
  - Add `GET /api/incidents/:id`
  - Update mobile tracking to use the detail endpoint

## 2026-06-13 18:40

- Current phase: `Phase 1 - Data flow and API completeness`
- Current task: `Add incident detail endpoint and remove duplicated incident list loading in mobile tracking`
- What changed:
  - Added regression tests for incident route registration and incident detail responses in `services/emergency-api/src/modules/incidents/routes.test.ts`.
  - Added `GET /api/incidents/:id` to the emergency API.
  - Updated mobile tracking to fetch one incident by id instead of loading the whole incident list.
  - Added `test` script in `services/emergency-api/package.json` and `test:api` in the root `package.json`.
- Verified:
  - `pnpm test:api`
  - `pnpm build:api`
  - `pnpm build`
- Open issues:
  - reference categories and location hooks still fetch duplicate data across multiple components.
  - admin users and mobile user profile still have mock-oriented areas to clean up later.
- Next action:
  - design and implement shared caching for reference categories / locations

## 2026-06-13 19:10

- Current phase: `Phase 1 - Data flow and API completeness`
- Current task: `Reduce duplicate fetches for reference categories and location lookups`
- What changed:
  - Added shared module-level cache loaders in `lib/reference-categories.ts`.
  - Added shared module-level cache loaders in `lib/reference-locations.ts`.
  - Added regression tests for category/location cache reuse in `lib/reference-cache.test.ts`.
  - Kept existing hooks API stable so admin/mobile components did not need page-level rewrites.
- Verified:
  - `pnpm --filter emergency-api exec tsx --test ..\\..\\lib\\reference-cache.test.ts`
  - `pnpm test:api`
  - `pnpm build:api`
  - `pnpm build`
- Open issues:
  - root project still does not have a dedicated frontend test runner.
  - admin users and mobile profile still include mock-oriented areas to clean up later.
- Next action:
  - inspect remaining main-flow mock usage and choose the next cleanup target

## 2026-06-13 19:40

- Current phase: `Phase 1 - Data flow and API completeness`
- Current task: `Move mobile user profile off direct mock-data import`
- What changed:
  - Added `lib/user-profile.ts` as an API-backed loader with fallback and shared cache.
  - Added `lib/user-profile.test.ts` for loader cache/fallback regression coverage.
  - Updated `components/mobile/user-profile-screen.tsx` to load profile data from `/api/users/mock-profile` instead of importing `mockUserProfile` directly.
- Verified:
  - `pnpm --filter emergency-api exec tsx --test ..\\..\\lib\\user-profile.test.ts`
  - `pnpm test:api`
  - `pnpm build:api`
  - `pnpm build`
- Open issues:
  - `admin/users` is still a fully mock-backed page.
  - root project still has helper tests piggybacking on the `tsx` runtime from `emergency-api`.
- Next action:
  - decide whether to convert `admin/users` to API-backed data or treat it as lower-priority scope

## 2026-06-13 20:10

- Current phase: `Phase 1 - Data flow and API completeness`
- Current task: `Fix inconsistent API status code on missing contact update`
- What changed:
  - Added `services/emergency-api/src/modules/contacts/routes.test.ts` to lock the not-found update behavior.
  - Fixed `PUT /api/contacts/:id` to return HTTP 404 when the contact does not exist.
- Verified:
  - `pnpm --filter emergency-api exec node --import tsx --test src/modules/contacts/routes.test.ts`
  - `pnpm test:api`
  - `pnpm build:api`
  - `pnpm build`
- Open issues:
  - other routes may still have inconsistent error payload/status behavior.
  - `admin/users` is still mock-backed and outside the hardened main flow.
- Next action:
  - review remaining routes for inconsistent 400/404 handling and standardize where it matters most

## 2026-06-13 20:40

- Current phase: `Phase 1 - Data flow and API completeness`
- Current task: `Add environment validation and example env file`
- What changed:
  - Added `services/emergency-api/src/config.test.ts` to lock config parsing behavior.
  - Refactored `services/emergency-api/src/config.ts` to export `parseConfig()` with zod validation for `PORT`, `DATABASE_URL`, and `CORS_ORIGIN`.
  - Added root `.env.example` for local/dev setup.
- Verified:
  - `pnpm --filter emergency-api exec node --import tsx --test src/config.test.ts`
  - `pnpm test:api`
  - `pnpm build:api`
  - `pnpm build`
- Open issues:
  - backend still relies on default Fastify logger output rather than an intentional request lifecycle format.
  - README and runbook still need to catch up with the current env/setup expectations.
- Next action:
  - add intentional request/error logging shape in `emergency-api` and document expected env usage

## 2026-06-13 21:10

- Current phase: `Phase 1 - Data flow and API completeness`
- Current task: `Add intentional request/error logging in emergency-api`
- What changed:
  - Added `services/emergency-api/src/observability.ts` for structured request, response, and error log contexts.
  - Added `services/emergency-api/src/observability.test.ts` to lock observability helper behavior.
  - Wired request/response hooks into `services/emergency-api/src/server.ts`.
  - Normalized unknown thrown values before logging and returning them from the Fastify error handler.
- Verified:
  - `pnpm --filter emergency-api exec node --import tsx --test src/observability.test.ts`
  - `pnpm test:api`
  - `pnpm build:api`
  - `pnpm build`
- Open issues:
  - README and runbook still need to be updated for the current startup, migration, and troubleshooting flow.
  - audit logging and rate limiting are still pending.
- Next action:
  - refresh README and add a short runbook for local/dev operations

## 2026-06-13 21:35

- Current phase: `Phase 1 - Data flow and API completeness`
- Current task: `Refresh project docs for the current real setup`
- What changed:
  - Rewrote root `README.md` with current architecture, setup, verification commands, URLs, and current caveats.
  - Added `RUNBOOK.md` with first-time setup, reset flow, verify flow, and troubleshooting notes.
- Verified:
  - `git status --short README.md RUNBOOK.md`
  - reviewed generated file contents with `type README.md` and `type RUNBOOK.md`
- Open issues:
  - audit logging is still pending
  - rate limiting is still pending
  - API error payloads are still only partially standardized
- Next action:
  - choose the next backend hardening task: audit logging, rate limiting, or error-shape standardization

## 2026-06-13 22:05

- Current phase: `Phase 1 - Data flow and API completeness`
- Current task: `Start standardizing API error payload shape`
- What changed:
  - Added `services/emergency-api/src/api-error.ts` and `services/emergency-api/src/api-error.test.ts`.
  - Updated server validation/internal error responses to include `error`, `code`, and `statusCode`.
  - Updated key incident/contact error responses to use the same payload builder.
- Verified:
  - `pnpm --filter emergency-api exec node --import tsx --test src/api-error.test.ts`
  - `pnpm test:api`
  - `pnpm build:api`
  - `pnpm build`
- Open issues:
  - not every route in every module uses the new helper yet.
  - audit logging and rate limiting are still pending.
- Next action:
  - decide whether to finish error-shape rollout across remaining routes or switch to audit logging next

## 2026-06-13 22:35

- Current phase: `Phase 1 - Data flow and API completeness`
- Current task: `Expand standardized API error payloads to more modules`
- What changed:
  - Added `services/emergency-api/src/modules/areas/routes.test.ts`.
  - Added `services/emergency-api/src/modules/reference/routes.test.ts`.
  - Updated `areas` and `reference` routes to use `buildApiErrorPayload()` for key 404 cases.
- Verified:
  - `pnpm --filter emergency-api exec node --import tsx --test src/modules/areas/routes.test.ts src/modules/reference/routes.test.ts`
  - `pnpm test:api`
  - `pnpm build:api`
  - `pnpm build`
- Open issues:
  - not every remaining route has moved to the new error helper yet.
  - audit logging and rate limiting are still pending.
- Next action:
  - decide whether to finish the last error-shape leftovers first or pivot to the next hardening slice

## 2026-06-13 22:55

- Current phase: `Phase 1 - Data flow and API completeness`
- Current task: `Add first rate-limiting guard`
- What changed:
  - Added `services/emergency-api/src/rate-limit.ts` and `services/emergency-api/src/rate-limit.test.ts`.
  - Added in-memory per-IP rate limiting to `POST /api/incidents`.
  - Standardized the 429 payload for incident rate limiting with code `INCIDENT_RATE_LIMITED`.
- Verified:
  - `pnpm --filter emergency-api exec node --import tsx --test src/rate-limit.test.ts`
  - `pnpm test:api`
  - `pnpm build:api`
  - `pnpm build`
- Open issues:
  - rate limiting only covers incident creation so far.
  - audit logging is still pending.
  - a few routes may still not use the new error helper everywhere.
- Next action:
  - choose whether to add audit logging next or finish the remaining error-shape leftovers

## 2026-06-13 23:20

- Current phase: `Phase 1 - Data flow and API completeness`
- Current task: `Add first audit logging slice`
- What changed:
  - Added `services/emergency-api/db/migrations/009_audit_logs.sql`.
  - Added `services/emergency-api/src/audit-log.ts` and `services/emergency-api/src/audit-log.test.ts`.
  - Added audit logging to `contacts.create`, `contacts.update`, `contacts.delete`, and `incidents.create`.
  - Added `pnpm db:migrate:audit-logs` and updated `Makefile` migration flows.
- Verified:
  - `pnpm --filter emergency-api exec node --import tsx --test src/audit-log.test.ts`
  - `pnpm test:api`
  - `pnpm build:api`
  - `pnpm build`
  - `pnpm db:migrate:audit-logs`
- Open issues:
  - audit coverage does not include all write endpoints yet.
  - rate limiting only protects incident creation so far.
  - a few routes may still not use the new error helper everywhere.
- Next action:
  - decide whether to extend audit coverage or broaden rate limiting next

## 2026-06-13 23:40

- Current phase: `Phase 1 - Data flow and API completeness`
- Current task: `Extend audit coverage to area writes`
- What changed:
  - Added audit logging to `areas.create`, `areas.update`, and `areas.delete`.
  - Added regression coverage in `services/emergency-api/src/modules/areas/routes.test.ts` for area creation audit behavior.
- Verified:
  - `pnpm --filter emergency-api exec node --import tsx --test src/modules/areas/routes.test.ts`
  - `pnpm test:api`
  - `pnpm build:api`
  - `pnpm build`
- Open issues:
  - not all write endpoints across the whole backend have audit coverage yet.
  - rate limiting still only covers incident creation.
  - some remaining routes may still not use the standardized error helper everywhere.
- Next action:
  - choose whether to keep extending audit coverage or pivot back to error-shape/rate-limiting cleanup

## 2026-06-13 23:58

- Current phase: `Phase 1 - Data flow and API completeness`
- Current task: `Verify and lock audit logging coverage across all emergency-api write endpoints`
- What changed:
  - Reviewed all write endpoints in `incidents`, `contacts`, and `areas` to confirm audit logging is already wired everywhere.
  - Added regression tests for `contacts.create`, `contacts.update`, and `contacts.delete` audit behavior.
  - Added a regression test for `incidents.create` audit behavior and aligned it with the real category-check -> area-resolve -> insert -> audit flow.
  - Updated `PRODUCTION_CHECKLIST.md` to mark audit logging coverage as complete for current backend write endpoints.
- Verified:
  - `pnpm --filter emergency-api exec node --import tsx --test src/modules/contacts/routes.test.ts`
  - `pnpm --filter emergency-api exec node --import tsx --test src/modules/incidents/routes.test.ts`
  - `pnpm test:api`
- Open issues:
  - rate limiting still only covers incident creation.
  - some remaining routes may still not use the standardized error helper everywhere.
  - write-endpoint validation can still be hardened further for fields like phone/category/area codes.
- Next action:
  - choose whether to finish error-shape rollout, broaden rate limiting, or tighten write validation next

## 2026-06-14 00:20

- Current phase: `Phase 1 - Data flow and API completeness`
- Current task: `Tighten write validation for contacts and incidents`
- What changed:
  - Added shared input validation helpers in `services/emergency-api/src/input-validation.ts` for standardized Zod payloads, phone checks, active category checks, and province/district code validation.
  - Updated `contacts` write routes to reject invalid phone numbers, unknown emergency categories, and mismatched province/district codes before writing to DB.
  - Updated `incidents.create` to reject invalid reporter phone numbers and unknown location codes before insert.
  - Added regression coverage for the new validation paths in `contacts/routes.test.ts` and `incidents/routes.test.ts`.
- Verified:
  - `pnpm --filter emergency-api exec node --import tsx --test src/modules/contacts/routes.test.ts`
  - `pnpm --filter emergency-api exec node --import tsx --test src/modules/incidents/routes.test.ts`
  - `pnpm test:api`
  - `pnpm build:api`
- Open issues:
  - rate limiting still only covers incident creation.
  - some remaining routes may still not use the standardized error helper everywhere.
  - `areas` write validation can still be deepened if we later allow more editable boundary metadata inputs.
- Next action:
  - choose whether to finish error-shape rollout, broaden rate limiting, or continue deeper write validation

## 2026-06-14 00:35

- Current phase: `Phase 1 - Data flow and API completeness`
- Current task: `Broaden rate limiting to contact write endpoints`
- What changed:
  - Added in-memory rate limiting to `POST /api/contacts`, `PUT /api/contacts/:id`, and `DELETE /api/contacts/:id`.
  - Added dedicated error codes and messages for contact create/update/delete throttling.
  - Extended contact route regression coverage to verify 429 behavior and `Retry-After` headers.
- Verified:
  - `pnpm --filter emergency-api exec node --import tsx --test src/modules/contacts/routes.test.ts`
  - `pnpm test:api`
  - `pnpm build:api`
- Open issues:
  - rate limiting still does not cover `areas` write endpoints.
  - some remaining routes may still not use the standardized error helper everywhere.
  - current rate limiting is in-memory only and would need a shared store for multi-instance production deployment.
- Next action:
  - choose whether to finish error-shape rollout, extend rate limiting to more endpoints, or move to a shared/store-backed rate limit strategy later

## 2026-06-14 00:50

- Current phase: `Phase 1 - Data flow and API completeness`
- Current task: `Standardize more handler-level validation error responses`
- What changed:
  - Updated `areas` routes to use `safeParse()` plus standardized validation payloads instead of letting handler-level `ZodError` bubble out directly.
  - Updated `reference` district lookup route to return the same standardized validation payload shape on invalid query input.
  - Added regression tests for invalid `areas.resolve-point`, invalid `areas.contains-point`, and invalid `reference.districts` requests.
- Verified:
  - `pnpm --filter emergency-api exec node --import tsx --test src/modules/areas/routes.test.ts`
  - `pnpm --filter emergency-api exec node --import tsx --test src/modules/reference/routes.test.ts`
  - `pnpm test:api`
  - `pnpm build:api`
- Open issues:
  - some routes still rely on the global error handler for validation responses instead of returning a route-local standardized payload.
  - rate limiting still does not cover `areas` write endpoints.
  - current rate limiting is in-memory only and would need a shared store for multi-instance production deployment.
- Next action:
  - choose whether to finish the last error-shape leftovers, extend rate limiting to more endpoints, or continue deeper validation hardening

## 2026-06-14 01:10

- Current phase: `Phase 1 - Data flow and API completeness`
- Current task: `Make central emergency phone numbers visible in every area while keeping local numbers area-scoped`
- What changed:
  - Added `coverageType` support to contact writes and reads, backed by `contacts.coverage_type`.
  - Updated `/api/contacts` to include `global` contacts together with matching `local` contacts when filtering by area.
  - Relaxed contact phone validation to allow real emergency short codes like `191`, `1669`, and `199` while keeping reporter phone validation strict.
  - Added migration `010_contact_coverage_type.sql`, wired it into package scripts and `Makefile`, and applied it to the local DB.
  - Updated dev seed so central emergency numbers are stored as `global`.
  - Updated mobile incident contact UI to separate `ส่วนกลาง` from `หน่วยงานในพื้นที่`.
  - Updated admin contacts UI to manage `coverageType` directly.
- Verified:
  - `pnpm --filter emergency-api exec node --import tsx --test src/modules/contacts/routes.test.ts`
  - `pnpm test:api`
  - `pnpm build:api`
  - `pnpm build`
  - DB query confirmed seeded core contacts now have `coverage_type = global`
- Open issues:
  - local DB currently still contains leftover test contacts like `Support Team` from earlier manual/test flows and may need cleanup.
  - rate limiting still does not cover `areas` write endpoints.
  - current rate limiting is in-memory only and would need a shared store for multi-instance production deployment.
- Next action:
  - confirm whether to clean leftover test contacts from local DB, then continue with the next production-hardening slice

## 2026-06-14 01:18

- Current phase: `Phase 1 - Data flow and API completeness`
- Current task: `Clean leftover local test contacts from local DB`
- What changed:
  - Deleted clearly test-only local contacts such as `Support Team`, `test`, and invalid placeholder phone rows from the local `contacts` table.
  - Rechecked DB state after cleanup.
- Verified:
  - DB query shows only 6 `global` contacts remain.
  - `total_contacts = 6`, `global_contacts = 6`, `local_contacts = 0`
- Open issues:
  - there are currently no real `local` contacts left in the local DB, so UI will only show central contacts until local agency numbers are added back.
  - rate limiting still does not cover `areas` write endpoints.
  - current rate limiting is in-memory only and would need a shared store for multi-instance production deployment.
- Next action:
  - decide whether to seed/add realistic local agency contacts for Bangkok/other areas so the new `global + local` behavior is visible end-to-end

## 2026-06-14 01:30

- Current phase: `Phase 1 - Data flow and API completeness`
- Current task: `Close remaining API error-shape cleanup`
- What changed:
  - Updated `contacts` routes so invalid query params and invalid path params return standardized `VALIDATION_ERROR` payloads with `issues`.
  - Updated `incidents` routes so invalid `:id` params and invalid `history` query input return the same standardized validation payload shape.
  - Confirmed route modules no longer use direct `.parse()` calls that bypass route-local standardized validation handling.
- Verified:
  - `pnpm --filter emergency-api exec node --import tsx --test src/modules/contacts/routes.test.ts`
  - `pnpm --filter emergency-api exec node --import tsx --test src/modules/incidents/routes.test.ts`
  - `pnpm test:api`
  - `pnpm build:api`
  - `rg -n "\\.parse\\(" services/emergency-api/src/modules` returned no matches
- Open issues:
  - there are currently no real `local` contacts left in the local DB, so UI will only show central contacts until local agency numbers are added back.
  - rate limiting still does not cover `areas` write endpoints.
  - current rate limiting is in-memory only and would need a shared store for multi-instance production deployment.
- Next action:
  - choose between extending rate limiting, adding realistic local contacts back into DB, or starting database readiness review

## 2026-06-14 22:25

- Current phase: `Phase 3 - Database Readiness`
- Current task: `Add DB-level foreign keys, constraints, and read-path indexes`
- What changed:
  - Reviewed current schema, live constraints, live indexes, and real query patterns before changing the database.
  - Added migration `011_database_readiness.sql`.
  - Added `contacts.category -> emergency_categories(id)` foreign key with `ON DELETE SET NULL`.
  - Added `incidents.category -> emergency_categories(id)` foreign key with `ON DELETE RESTRICT`.
  - Added DB-level checks for `incidents.severity`, `incidents.status`, and nullable `incidents.call_status`.
  - Added `contacts_created_at_idx`, `contacts_coverage_type_created_at_idx`, and `incidents_created_at_idx` for the main newest-first list flows.
  - Wired the new migration into `package.json` and `Makefile`.
  - Applied the migration successfully to the local DB.
- Verified:
  - `pnpm db:migrate:db-readiness`
  - DB query confirmed `contacts_category_fk`, `incidents_category_fk`, `incidents_severity_check`, `incidents_status_check`, and `incidents_call_status_check`
  - DB query confirmed `contacts_created_at_idx`, `contacts_coverage_type_created_at_idx`, and `incidents_created_at_idx`
  - `pnpm test:api`
  - `pnpm build:api`
- Open issues:
  - `Verify migrations from a clean database` is still pending because a destructive local reset was not run in this pass.
  - seed data is still partly mock-derived and should stay clearly separated from production-like reference data decisions.
  - there are currently no real `local` contacts left in the local DB, so UI will only show central contacts until local agency numbers are added back.
- Next action:
  - choose between running a clean DB reset verification or writing backup/restore notes to keep Phase 3 moving

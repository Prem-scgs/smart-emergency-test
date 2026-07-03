# FSD-lite Guide

Smart Emergency uses FSD-lite for new frontend code. The goal is to keep route files small, make domain ownership visible, and avoid adding more runtime code to `lib/`.

อ่านคู่กับ [CODE_CONVENTIONS_TH.md](CODE_CONVENTIONS_TH.md) เสมอ เพราะหลังจากนี้การเพิ่มหรือแก้ logic สำคัญต้องอัปเดต comment/docs ที่เกี่ยวข้องด้วย

## Layers

- `app/`: Next.js routes and page composition only.
- `widgets/`: large UI sections that combine features/entities, such as a dashboard map, incident queue, or admin layout.
- `features/`: user workflows and actions, such as incident alert handling, status update, contact management, location sharing, or report export.
- `entities/`: domain objects, types, and mappers, such as incident, contact, area, category, agency, and admin user.
- `shared/`: cross-domain utilities, UI primitives, API helpers, config, i18n, realtime helpers, and small pure utilities.
- `lib/`: compatibility bridge only while the existing codebase is migrated. Do not add new runtime logic here.

## Dependency Direction

Allowed direction:

```txt
app -> widgets -> features -> entities -> shared
```

Rules:

- `shared` must not import from `entities`, `features`, `widgets`, or `app`.
- `entities` must not import from `features`, `widgets`, or `app`.
- `features` must not import from `widgets` or `app`.
- `widgets` must not import from `app`.
- New runtime code must not be added to `lib/`; add it to the correct FSD-lite layer and keep a `lib/` re-export only if old imports still exist.

## Recommended Paths

Use these paths for new or moved code:

```txt
shared/api/                 API URL helpers, fetch wrappers, admin headers
shared/realtime/            SSE client helpers, polling fallback utilities
shared/i18n/                dictionaries, translation helpers, locale preference
shared/config/              browser-safe config and feature flags
shared/ui/                  reusable UI primitives that are not tied to one domain
shared/utils/               small pure helpers used across domains

entities/incident/          incident types, status labels, mappers, formatters
entities/contact/           emergency contact types, category mapping, phone rules
entities/area/              province/district/area types, GeoJSON helpers
entities/category/          emergency category metadata and labels
entities/admin-user/        admin role/scope helpers after real auth contract lands

features/incident-alert/    admin alert popup, sound behavior, duplicate guards
features/status-update/     update status workflow and version conflict handling
features/contact-management/contact form validation and CRUD workflow
features/location-sharing/  share location card and provider URL generation
features/report-export/     CSV/PDF/print export actions

widgets/dashboard-map/      dashboard map, markers, selected incident panel
widgets/incident-queue/     incident list/queue panel
widgets/gis-browser/        GIS area list and boundary map composition
widgets/admin-shell/        admin layout composition if split later
```

## File Placement Checklist

Before creating a new frontend file, answer one question:

> Is this a route, widget, feature, entity, or shared utility?

If the answer is unclear, do not create the file yet. Rename or split the responsibility first.

## `lib/` Bridge Rule

`lib/` exists for backward compatibility during migration only.

Allowed in `lib/`:

```ts
export { getEmergencyApiBaseUrl } from '@/shared/api/emergency-api-url'
```

Not allowed in `lib/`:

```ts
// New runtime implementation should not be added here.
export function buildNewIncidentPayload() {
  // ...
}
```

When touching an old `lib/` file:

1. Move implementation to the correct FSD-lite layer if it is safe.
2. Keep `lib/` as a re-export bridge while old imports still exist.
3. Run build/tests.
4. Remove the bridge only when `rg` confirms no old import remains.

## Rollout Plan

### Phase 1: Rules and docs

- Keep this guide updated.
- Keep [CODE_CONVENTIONS_TH.md](CODE_CONVENTIONS_TH.md) updated.
- Add comment/docs checks before commit.
- Do not move large runtime files just for structure.

### Phase 2: Low-risk shared code

Move shared code first because it has the lowest UI risk:

- `shared/api`
- `shared/realtime`
- `shared/i18n`
- `shared/config`

### Phase 3: Domain-by-domain migration

Move domains only when there is real work in that area:

- `entities/incident`
- `entities/contact`
- `entities/area`
- `features/incident-alert`
- `features/status-update`
- `widgets/dashboard-map`

### Phase 4: Reduce bridges

- Use `rg` to find old imports.
- Remove bridge files only after no runtime import remains.
- Every bridge removal must pass build/tests.

## Current Migration Notes

- `shared/api` owns browser-facing API URL and admin scope helper code.
- `lib/admin-api.ts` and `lib/emergency-api-url.ts` are bridge exports only.
- Move larger domains later in small steps: incident first, then contact, area, reports, settings, and mobile tracking.
- Do not combine FSD moves with behavior changes unless a test or build error requires it.
- Generated UI files from shadcn/mapcn should normally stay where their generator expects; summarize usage in docs instead of editing generated files heavily.

# FSD-lite Guide

Smart Emergency uses FSD-lite for new frontend code. The goal is to keep route files small, make domain ownership visible, and avoid adding more runtime code to `lib/`.

อ่านคู่กับ [CODE_CONVENTIONS_TH.md](CODE_CONVENTIONS_TH.md) เสมอ เพราะการเพิ่มหรือแก้ logic สำคัญต้องอัปเดต comment/docs ที่เกี่ยวข้องด้วย

## Layers

- `app/`: Next.js routes and page composition only.
- `widgets/`: large UI sections that combine features/entities, such as a dashboard map, incident queue, or admin layout.
- `features/`: user workflows and actions, such as incident alert handling, status update, contact management, location sharing, or report export.
- `entities/`: domain objects, types, and mappers, such as incident, contact, area, category, agency, and admin user.
- `shared/`: cross-domain utilities, UI primitives, API helpers, config, i18n, realtime helpers, and small pure utilities.
- `lib/`: tests and wiring checks only. Do not add new runtime logic here.

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
shared/reference/           category reference data loaders and display helpers used across admin/mobile
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
features/mobile-incident/   mobile incident payloads, GPS lock status helpers, reporter session storage
features/status-update/     update status workflow and version conflict handling
features/contact-management/contact form validation and CRUD workflow
features/location-sharing/  production incident location sharing helpers, provider URLs, and share card UI
features/report-export/     CSV/PDF/print export actions

widgets/dashboard-map/      dashboard map section, incident queue, dashboard data and detail wiring
widgets/incident-queue/     reserved only if the queue is split out of dashboard-map later
widgets/gis-browser/        GIS area list and boundary map composition
widgets/admin-gis/          admin GIS page UI, area filters, boundary map, fit-bounds wiring, contact and incident markers
widgets/admin-login/        admin login page UI, role selector, agency selector, and login submit flow
widgets/admin-shell/        admin layout shell, header notification UI, navigation and organization settings wiring
widgets/admin-users/        admin users placeholder page while real auth/user management is out of scope
widgets/admin-contacts/     admin contacts page UI, filters, CRUD form, location selector, and delete confirmation flow
widgets/admin-call-logs/    admin call logs page UI, filters, pagination, export and print snapshot logic
widgets/admin-reports/      admin reports page UI, range filters, KPI cards, charts, export and print snapshot logic
widgets/admin-settings/     admin settings page UI, personal preferences, organization/share-channel settings, and health snapshot UI
widgets/mobile-emergency/   mobile app shell, mobile screens, and mobile flow orchestration
```

## File Placement Checklist

Before creating a new frontend file, answer one question:

> Is this a route, widget, feature, entity, or shared utility?

If the answer is unclear, do not create the file yet. Rename or split the responsibility first.

## `lib/` Bridge Rule

`lib/` exists for backward compatibility during migration only.

Allowed in `lib/`:

```ts
export { getEmergencyApiBaseUrl } from '@/shared/config/emergency-api'
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
- `shared/config` owns browser-safe emergency API URL fallback helpers.
- `shared/realtime` owns SSE URL helpers, event payload validation, and polling fallback helpers.
- `shared/reference` owns category reference loaders, fallback category data, and admin/mobile category display helpers.
- `shared/i18n/admin` owns admin i18n provider/hook, language preference constants, and Thai/English dictionaries split by locale.
- `entities/incident` owns status workflow/meta/display helpers and emergency category types.
- `entities/contact` owns coverage/display/phone/role/scope helpers and emergency contact types.
- `entities/call` owns call status and call log types.
- `entities/area` owns polygon/display/map-style/GeoJSON feature helpers.
- `features/incident-alert` owns admin alert artifact, visibility, detail navigation, sound helpers, alert preferences, notification provider/hook, admin SSE hook, and alert/notification/SSE types.
- `features/mobile-incident` owns mobile incident create/call payload helpers, mobile GPS lock status helpers, and reporter session/phone localStorage helpers.
- `features/location-sharing` owns production incident location sharing helpers, share-channel URLs, mobile platform detection, Thai reporter phone validation, map URL/copy-message formatting, share attempt response types, and `IncidentLocationShareCard` UI.
- `shared/auth` owns admin auth/session types, `ROLE_PERMISSIONS`, `AuthProvider`, `useAuth`, agency registry data, and stale-session restore guards. The retired `operator` role is no longer part of the frontend auth contract.
- `shared/location` owns shared location value types, province/district reference loaders, lookup maps, and location display/canonical-name helpers.
- Old user profile screen, mock profile loader, and user profile types were removed during final cleanup because production mobile flow no longer uses them.
- Old SMS/Google Maps share helpers and their old mobile screen were removed after production sharing moved to `features/location-sharing`.
- `lib/types.ts` was removed after `rg` confirmed no imports remained; use the canonical owners directly.
- Root `lib/mock-data.ts` was removed after `465d5d9`; the later old mock profile files were removed during final cleanup.
- `shared/utils` owns `cn`, the `clsx` + `tailwind-merge` className helper used by UI, admin, mobile, and dashboard widget code. Root `lib/utils.ts` was removed after all imports moved to `@/shared/utils`.
- `widgets/admin-shell` owns the admin dashboard shell, sidebar/header composition, notification bell/center UI, role badge metadata, navigation item config, and organization settings loading. The old `components/admin/admin-layout-client.tsx`, `notification-bell.tsx`, and `notification-center.tsx` files were removed after `rg` confirmed no imports remained.
- `widgets/admin-gis` owns the admin GIS page UI, province/district loading state, area filters, contact/incident sidebars, boundary map UI, `GisBoundaryMap`, `GisBoundary` type, selected-area fit bounds, area popup, and contact/incident marker rendering. The route file `app/admin/(dashboard)/gis/page.tsx` is now a thin shell.
- `widgets/admin-login` owns the admin login page UI, role selector, agency selector, and login submit flow. The route file `app/admin/page.tsx` is now a thin shell.
- `widgets/admin-users` owns the current admin users placeholder page while real auth/user management remains out of scope. The route file `app/admin/(dashboard)/users/page.tsx` is now a thin shell.
- `widgets/admin-contacts` owns the admin contacts page UI, role-scoped filters, create/edit/delete dialog flow, category selector, and province/district location selector. The route file `app/admin/(dashboard)/contacts/page.tsx` is now a thin shell.
- `widgets/admin-call-logs` owns the admin call logs page UI, loading state, role-scoped filters, pagination, CSV/PDF export, and print snapshot logic. The route file `app/admin/(dashboard)/call-logs/page.tsx` is now a thin shell.
- `widgets/admin-reports` owns the admin reports page UI, range filter, loading state, KPI cards, charts/tabs, CSV/PDF export, and print snapshot logic. The route file `app/admin/(dashboard)/reports/page.tsx` is now a thin shell.
- `widgets/admin-settings` owns the admin settings page UI, personal preference storage, organization settings form, share-channel settings form, and system health snapshot UI. The route file `app/admin/(dashboard)/settings/page.tsx` is now a thin shell.
- `widgets/mobile-emergency` owns the top-level `MobileApp` shell, splash screen, location header, emergency category grid, SOS button, bottom nav, incident selection screen, tracking/history screens, mobile location/contact loading orchestration, and call-result dialog wiring. `features/location-sharing` owns the production incident location share card.
- `widgets/dashboard-map` owns dashboard map location/filter/localization/display helpers.
- `widgets/dashboard-map` owns the dashboard map section composition, dashboard data hook, selected incident detail controller, selected-area bounds hook, and dashboard KPI/chart view-model helpers.
- `widgets/dashboard-map` owns `IncidentQueue` and its queue item props. The old `components/admin/incident-queue.tsx` bridge was removed after `rg` confirmed no runtime imports remained.
- `widgets/dashboard-map` owns `IncidentMap`, its map point props, viewport/geolocation logic, popup display helpers, and selected-area/selected-incident map wiring. The old `components/admin/incident-map.tsx` bridge was removed after `rg` confirmed no runtime imports remained.
- `widgets/dashboard-map` owns `IncidentDetailPanel` UI and helper/controller code as of `7ed88fd`, including tracking URL construction, status update payload/error handling, display/location/status helpers, viewer read-only choices, close-warning decisions, and optimistic-concurrency contracts. The old `components/admin/incident-detail-panel.tsx` bridge was removed after `rg` confirmed no runtime imports remained.
- `widgets/dashboard-map` owns `IncidentStatusTimeline` because it is only used by the dashboard incident detail panel. The old `components/admin/incident-status-timeline.tsx` component was removed after `rg` confirmed no imports remained.
- Route files should stay as shells that provide auth/i18n/reference context and compose the appropriate widget.
- Keep only necessary compatibility bridge/re-export files in `lib/`; run `rg` before removing any bridge and verify build/tests after removal.
- Further moves should be planned separately. The main dashboard map widget now owns queue, map, and detail panel UI; do not remove compatibility bridges until `rg` confirms there are no old runtime imports and build/tests pass.
- Do not combine FSD moves with behavior changes unless a test or build error requires it.
- Generated UI files from shadcn/mapcn should normally stay where their generator expects; summarize usage in docs instead of editing generated files heavily.

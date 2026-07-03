# FSD-lite Guide

Smart Emergency uses FSD-lite for new frontend code. The goal is to keep route
files small, make domain ownership visible, and avoid adding more runtime code
to `lib/`.

## Layers

- `app/`: Next.js routes and page composition only.
- `widgets/`: large UI sections that combine features/entities, such as a
  dashboard map, incident queue, or admin layout.
- `features/`: user workflows and actions, such as incident alert handling,
  status update, contact management, location sharing, or report export.
- `entities/`: domain objects, types, and mappers, such as incident, contact,
  area, category, agency, and admin user.
- `shared/`: cross-domain utilities, UI primitives, API helpers, config,
  i18n, realtime helpers, and small pure utilities.
- `lib/`: compatibility bridge only while the existing codebase is migrated.

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
- New runtime code should not be added to `lib/`; add it to the correct
  FSD-lite layer and keep a `lib/` re-export only if old imports still exist.

## File Placement Checklist

Before creating a new frontend file, answer one question:

> Is this a route, widget, feature, entity, or shared utility?

If the answer is unclear, do not create the file yet. Rename or split the
responsibility first.

## Current Migration Notes

- `shared/api` owns browser-facing API URL and admin scope helper code.
- `lib/admin-api.ts` and `lib/emergency-api-url.ts` are bridge exports only.
- Move larger domains later in small steps: incident first, then contact, area,
  reports, settings, and mobile tracking.
- Do not combine FSD moves with behavior changes unless a test or build error
  requires it.

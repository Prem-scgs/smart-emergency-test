# Admin Close And Rollback Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow incident closure without a summary after explicit warning, and let `super_admin` move an incident backward with a required reason.

**Architecture:** Keep transition authorization in the API workflow and derive Admin UI choices through a small pure helper. The detail panel submits one selected target status, asks for confirmation only when closing without a summary, and keeps optimistic-version conflict handling unchanged.

**Tech Stack:** Next.js 16, React 19, TypeScript, shadcn/ui, Fastify, Node test runner

---

### Task 1: Backend Close Rule

**Files:**
- Modify: `services/emergency-api/src/modules/incidents/status-workflow.test.ts`
- Modify: `services/emergency-api/src/modules/incidents/status-workflow.ts`

- [ ] **Step 1: Change the close test to require no note**

```ts
test("allows closing an incident without a resolution summary", () => {
  const result = validateIncidentStatusTransition({
    role: "agency_admin",
    fromStatus: "on_scene",
    toStatus: "closed",
  });

  assert.deepEqual(result, {
    ok: true,
    transition: {
      fromStatus: "on_scene",
      toStatus: "closed",
      note: null,
    },
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `rtk pnpm --filter emergency-api test`

Expected: FAIL because the workflow returns `INCIDENT_RESOLUTION_REQUIRED`.

- [ ] **Step 3: Remove only the backend close-summary rejection**

Delete the `input.toStatus === "closed" && !normalizedNote` rejection. Keep the backward-transition reason requirement unchanged.

- [ ] **Step 4: Run API tests and verify GREEN**

Run: `rtk pnpm --filter emergency-api test`

Expected: all API tests pass.

### Task 2: Status Choice Rules

**Files:**
- Create: `lib/admin-status-controls.ts`
- Create: `lib/admin-status-controls.test.ts`
- Modify: `lib/incident-tracking.ts`

- [ ] **Step 1: Write failing tests for role-specific choices**

```ts
test('agency admin receives only the next status', () => {
  assert.deepEqual(getAdminStatusChoices('agency_admin', 'dispatched'), ['on_scene'])
})

test('super admin receives every status except the current status', () => {
  assert.deepEqual(getAdminStatusChoices('super_admin', 'closed'), [
    'reported', 'acknowledged', 'coordinating', 'dispatched', 'on_scene',
  ])
})

test('requires a reason only for backward changes', () => {
  assert.equal(requiresStatusReason('closed', 'on_scene'), true)
  assert.equal(requiresStatusReason('on_scene', 'closed'), false)
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `rtk node --experimental-strip-types --test lib/admin-status-controls.test.ts`

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Export the existing workflow order and implement the pure choice helper**

Rename the existing private `WORKFLOW` constant in `lib/incident-tracking.ts` to the exported `INCIDENT_TRACKING_STATUS_ORDER`, then use that same constant throughout the file and helper.

```ts
import { INCIDENT_TRACKING_STATUS_ORDER, type IncidentWorkflowStatus } from './incident-tracking.ts'

export type StatusAdminRole = 'agency_admin' | 'super_admin'

export function getAdminStatusChoices(role: StatusAdminRole, current: IncidentWorkflowStatus) {
  const currentIndex = INCIDENT_TRACKING_STATUS_ORDER.indexOf(current)
  if (role === 'agency_admin') {
    return INCIDENT_TRACKING_STATUS_ORDER.slice(currentIndex + 1, currentIndex + 2)
  }
  return INCIDENT_TRACKING_STATUS_ORDER.filter(status => status !== current)
}

export function requiresStatusReason(from: IncidentWorkflowStatus, to: IncidentWorkflowStatus) {
  return INCIDENT_TRACKING_STATUS_ORDER.indexOf(to) < INCIDENT_TRACKING_STATUS_ORDER.indexOf(from)
}
```

- [ ] **Step 4: Run the helper tests and verify GREEN**

Run: `rtk node --experimental-strip-types --test lib/admin-status-controls.test.ts`

Expected: all helper tests pass.

### Task 3: Admin Detail Controls And Warning

**Files:**
- Modify: `components/admin/incident-detail-panel.tsx`

- [ ] **Step 1: Replace fixed next-status state with a selected target**

Derive the role using `getBackendAdminScope(user)`, derive choices using `getAdminStatusChoices`, and reset `targetStatus` and `note` whenever the selected incident changes.

- [ ] **Step 2: Render role-specific controls**

For `agency_admin`, show the single next status. For `super_admin`, render a shadcn `Select` containing every workflow status except the current one. Label backward options as requiring a reason.

- [ ] **Step 3: Make close summary optional with explicit confirmation**

Keep the update button enabled when `targetStatus === 'closed'` and note is blank. On click, open a shadcn `AlertDialog` with:

```text
ยังไม่ได้ระบุสรุปการปิดเหตุ
คุณสามารถปิดเหตุได้โดยไม่กรอกสรุป ต้องการดำเนินการต่อหรือไม่
```

The confirm button calls the existing PATCH flow. Normal submissions do not open this dialog.

- [ ] **Step 4: Require a reason before a backward request**

Disable the update button when `requiresStatusReason(currentStatus, targetStatus)` is true and `note.trim()` is empty. Show `เหตุผลที่ย้อนสถานะ` as the label and explain that it is required for the audit trail.

- [ ] **Step 5: Preserve conflict and realtime behavior**

Submit `fromStatus`, selected `toStatus`, `expectedVersion`, and optional `note`. Keep the current `409` reload behavior, success toast, status refetch, Dashboard refresh callback, and SSE flow unchanged.

### Task 4: Verification

**Files:**
- Modify: `CODEX_HANDOFF.md`
- Modify: `docs/operations/SESSION_LOG.md`

- [ ] **Step 1: Run automated verification**

Run:

```powershell
rtk pnpm --filter emergency-api test
rtk node --experimental-strip-types --test lib/admin-status-controls.test.ts lib/incident-tracking.test.ts
rtk pnpm --filter emergency-api build
rtk pnpm build
```

Expected: all tests and both builds pass.

- [ ] **Step 2: Verify in the browser**

As `super_admin`, open an `on_scene` case and confirm both backward targets and `closed` are selectable. Verify blank close opens the warning and can be cancelled. Verify a backward target cannot submit without a reason. Use a disposable/local case for any confirmed mutation.

- [ ] **Step 3: Update handoff documents**

Record the changed close rule, super-admin rollback UI, exact test counts, and build results.

- [ ] **Step 4: Stop before Git operations**

Show the changed-file list and proposed Thai commit message. Ask Prem before `git add`, commit, or push.

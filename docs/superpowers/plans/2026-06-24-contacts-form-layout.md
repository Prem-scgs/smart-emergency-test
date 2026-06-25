# Contacts Form Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify the Contacts add/edit dialog so admins only enter fields that affect emergency-number matching.

**Architecture:** Keep the existing Contacts API and schema. The form keeps `role: 'responder'` in its request payload, but removes it from the UI. The dialog becomes one linear form with lightweight headings instead of nested bordered sections.

**Tech Stack:** Next.js, React, existing shadcn/Base UI components, Node test runner.

---

### Task 1: Simplify the Contacts dialog

**Files:**
- Modify: `app/admin/(dashboard)/contacts/page.tsx`
- Test: `lib/contact-coverage.test.ts`

- [ ] **Step 1: Write the failing test**

Add a test asserting the default contact role remains `responder` when no role is supplied by the form.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test lib/contact-coverage.test.ts`
Expected: FAIL because the default-role helper does not exist.

- [ ] **Step 3: Write minimal implementation**

Add a helper that returns `responder` for an empty role. Remove the role input. Use that helper in the Contact save payload. Flatten the dialog into a linear layout: name, phone/category, scope, conditional location, switches.

- [ ] **Step 4: Run tests and build**

Run: `node --experimental-strip-types --test lib/contact-coverage.test.ts` and `pnpm build`.
Expected: PASS.

- [ ] **Step 5: Verify in browser**

Open `/admin/contacts`, verify no role input appears, create dialog remains readable, and save payload retains `role: 'responder'`.

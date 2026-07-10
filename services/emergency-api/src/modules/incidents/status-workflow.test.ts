/**
 * ???? incident status workflow rules ???? next status, backward reason ??? close summary.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  INCIDENT_STATUS_ORDER,
  validateIncidentStatusTransition,
} from "./status-workflow.js";

test("defines the approved incident status order", () => {
  assert.deepEqual(INCIDENT_STATUS_ORDER, [
    "reported",
    "acknowledged",
    "coordinating",
    "dispatched",
    "on_scene",
    "closed",
  ]);
});

test("allows agency admin to move to the next status", () => {
  const result = validateIncidentStatusTransition({
    role: "agency_admin",
    fromStatus: "reported",
    toStatus: "acknowledged",
  });

  assert.equal(result.ok, true);
});

test("rejects agency admin skipping a status", () => {
  const result = validateIncidentStatusTransition({
    role: "agency_admin",
    fromStatus: "reported",
    toStatus: "dispatched",
  });

  assert.deepEqual(result, {
    ok: false,
    statusCode: 403,
    code: "INCIDENT_STATUS_TRANSITION_FORBIDDEN",
    error: "Agency admins can only move an incident to the next status",
  });
});

test("rejects agency admin moving a status backward", () => {
  const result = validateIncidentStatusTransition({
    role: "agency_admin",
    fromStatus: "dispatched",
    toStatus: "coordinating",
  });

  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "INCIDENT_STATUS_TRANSITION_FORBIDDEN");
});

test("allows super admin to move a status backward", () => {
  const result = validateIncidentStatusTransition({
    role: "super_admin",
    fromStatus: "dispatched",
    toStatus: "coordinating",
    note: "Correcting an operator mistake",
  });

  assert.equal(result.ok, true);
});

test("rejects an unchanged status", () => {
  const result = validateIncidentStatusTransition({
    role: "super_admin",
    fromStatus: "acknowledged",
    toStatus: "acknowledged",
  });

  assert.deepEqual(result, {
    ok: false,
    statusCode: 400,
    code: "INCIDENT_STATUS_UNCHANGED",
    error: "Incident is already in the requested status",
  });
});

test("requires a reason when super admin moves a status backward", () => {
  const result = validateIncidentStatusTransition({
    role: "super_admin",
    fromStatus: "dispatched",
    toStatus: "coordinating",
    note: "   ",
  });

  assert.deepEqual(result, {
    ok: false,
    statusCode: 400,
    code: "INCIDENT_STATUS_REASON_REQUIRED",
    error: "A reason is required when moving an incident backward",
  });
});

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

test("accepts and normalizes a resolution summary", () => {
  const result = validateIncidentStatusTransition({
    role: "agency_admin",
    fromStatus: "on_scene",
    toStatus: "closed",
    note: "  Patient transferred to hospital  ",
  });

  assert.deepEqual(result, {
    ok: true,
    transition: {
      fromStatus: "on_scene",
      toStatus: "closed",
      note: "Patient transferred to hospital",
    },
  });
});

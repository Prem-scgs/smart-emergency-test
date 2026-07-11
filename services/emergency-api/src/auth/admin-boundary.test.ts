import assert from "node:assert/strict";
import test from "node:test";

import {
  applyTrustedAdminScope,
  isPublicApiRoute,
  stripUntrustedAdminScope,
} from "./admin-boundary.js";

test("public API allowlist keeps reporter and reference flows unauthenticated", () => {
  assert.equal(isPublicApiRoute("OPTIONS", "*"), true);
  assert.equal(isPublicApiRoute("GET", "/health"), true);
  assert.equal(isPublicApiRoute("POST", "/api/auth/login"), true);
  assert.equal(isPublicApiRoute("POST", "/api/incidents"), true);
  assert.equal(isPublicApiRoute("GET", "/api/incidents/:id/tracking"), true);
  assert.equal(isPublicApiRoute("GET", "/api/incidents/:id/events"), true);
  assert.equal(isPublicApiRoute("GET", "/api/incidents/history"), true);
  assert.equal(isPublicApiRoute("PUT", "/api/incidents/:id/call"), true);
  assert.equal(isPublicApiRoute("POST", "/api/incidents/:id/share-attempts"), true);
  assert.equal(isPublicApiRoute("GET", "/api/contacts"), true);
  assert.equal(isPublicApiRoute("GET", "/api/areas"), true);
  assert.equal(isPublicApiRoute("GET", "/api/areas/resolve-point"), true);
  assert.equal(isPublicApiRoute("GET", "/api/reference/categories"), true);
});

test("admin data and mutation routes are not public", () => {
  assert.equal(isPublicApiRoute("GET", "/api/incidents"), false);
  assert.equal(isPublicApiRoute("GET", "/api/incidents/recent"), false);
  assert.equal(isPublicApiRoute("PATCH", "/api/incidents/:id/status"), false);
  assert.equal(isPublicApiRoute("POST", "/api/contacts"), false);
  assert.equal(isPublicApiRoute("POST", "/api/areas"), false);
  assert.equal(isPublicApiRoute("GET", "/api/reports/summary"), false);
  assert.equal(isPublicApiRoute("GET", "/api/admin/organization-settings"), false);
});

test("untrusted role and category headers are removed before route handlers", () => {
  const headers: Record<string, unknown> = {
    authorization: "Bearer token",
    "x-admin-role": "super_admin",
    "x-admin-category": "fire",
  };

  stripUntrustedAdminScope(headers);

  assert.equal(headers.authorization, "Bearer token");
  assert.equal(headers["x-admin-role"], undefined);
  assert.equal(headers["x-admin-category"], undefined);
});

test("trusted DB identity is translated to the legacy route scope shape", () => {
  const superHeaders: Record<string, unknown> = {};
  applyTrustedAdminScope(superHeaders, { role: "super_admin", category: null });
  assert.deepEqual(superHeaders, { "x-admin-role": "super_admin" });

  const agencyHeaders: Record<string, unknown> = {};
  applyTrustedAdminScope(agencyHeaders, { role: "agency_admin", category: "medical" });
  assert.deepEqual(agencyHeaders, {
    "x-admin-role": "agency_admin",
    "x-admin-category": "medical",
  });
});

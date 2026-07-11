import assert from "node:assert/strict";
import test from "node:test";

import { mapAdminUserProfile, validateRoleAgency } from "./admin-user.js";

test("mapAdminUserProfile excludes password hash and normalizes DB fields", () => {
  const profile = mapAdminUserProfile({
    id: "user-1", email: "admin@example.com", display_name: "Admin",
    password_hash: "secret", jwt_subject: "subject-1", role: "viewer",
    agency_id: "agency-1", active: true, created_at: new Date("2026-01-01T00:00:00Z"),
    updated_at: new Date("2026-01-02T00:00:00Z"),
    agency_name: "Medical Center", agency_category: "medical",
  });

  assert.equal("passwordHash" in profile, false);
  assert.equal("password_hash" in profile, false);
  assert.equal("jwtSubject" in profile, false);
  assert.deepEqual(profile, {
    id: "user-1", email: "admin@example.com", displayName: "Admin",
    role: "viewer", agencyId: "agency-1",
    agency: { id: "agency-1", name: "Medical Center", category: "medical" }, active: true,
    createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z",
  });
});

test("scoped roles require an agency while super admins cannot have one", () => {
  assert.throws(() => validateRoleAgency("viewer", null), /agency/i);
  assert.throws(() => validateRoleAgency("agency_admin", null), /agency/i);
  assert.throws(() => validateRoleAgency("super_admin", "agency-1"), /agency/i);
  assert.doesNotThrow(() => validateRoleAgency("viewer", "agency-1"));
});

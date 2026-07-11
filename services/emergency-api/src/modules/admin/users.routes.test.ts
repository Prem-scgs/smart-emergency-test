import assert from "node:assert/strict";
import test from "node:test";

import { pool } from "../../db.js";
import { getAdminUserWriteError, registerAdminUserRoutes } from "./users.routes.js";

type Handler = (request: any, reply: any) => Promise<any>;
function fakeApp() { const maps = { get: new Map<string, Handler>(), post: new Map<string, Handler>(), patch: new Map<string, Handler>(), delete: new Map<string, Handler>() }; return { ...Object.fromEntries(Object.entries(maps).map(([method, handlers]) => [method, (path: string, _opts: any, handler?: Handler) => handlers.set(path, handler ?? _opts)])), maps }; }
function reply() { return { statusCode: 200, code(value: number) { this.statusCode = value; return this; } }; }

test("admin user CRUD routes are registered", async () => {
  const app = fakeApp(); await registerAdminUserRoutes(app as any);
  assert.ok(app.maps.get.has("/api/admin/users")); assert.ok(app.maps.post.has("/api/admin/users"));
  assert.ok(app.maps.patch.has("/api/admin/users/:id")); assert.ok(app.maps.delete.has("/api/admin/users/:id"));
});

test("non-super admins cannot list users", async () => {
  const app = fakeApp(); await registerAdminUserRoutes(app as any); const response = reply();
  const result = await app.maps.get.get("/api/admin/users")!({ admin: { id: "u1", jwtSubject: "s1", role: "viewer", agencyId: "a1" } }, response);
  assert.equal(response.statusCode, 403); assert.equal(result.code, "ADMIN_USERS_FORBIDDEN");
});

test("user list includes active agencies so the UI submits real agency UUIDs", async () => {
  const app = fakeApp(); const original = pool.query;
  (pool.query as any) = async (sql: unknown) => {
    if (/FROM admin_users/.test(String(sql))) return { rows: [] };
    if (/FROM agencies/.test(String(sql))) return { rows: [{ id: "a1", name: "Medical", category: "medical" }] };
    return { rows: [] };
  };
  try {
    await registerAdminUserRoutes(app as any);
    const result = await app.maps.get.get("/api/admin/users")!({ admin: { id: "u1", jwtSubject: "s1", role: "super_admin", agencyId: null } }, reply());
    assert.deepEqual(result, { users: [], agencies: [{ id: "a1", name: "Medical", category: "medical" }] });
  } finally { (pool.query as any) = original; }
});

test("a super admin cannot alter or deactivate their own account", async () => {
  const app = fakeApp(); await registerAdminUserRoutes(app as any);
  for (const body of [{ role: "viewer", agencyId: "11111111-1111-4111-8111-111111111111" }, { password: "new password" }, { active: false }]) {
    const response = reply();
    const result = await app.maps.patch.get("/api/admin/users/:id")!({ params: { id: "u1" }, body, admin: { id: "u1", jwtSubject: "s1", role: "super_admin", agencyId: null } }, response);
    assert.equal(response.statusCode, 400); assert.equal(result.code, "ADMIN_USER_SELF_PROTECTION");
  }
  const response = reply();
  await app.maps.delete.get("/api/admin/users/:id")!({ params: { id: "u1" }, admin: { id: "u1", jwtSubject: "s1", role: "super_admin", agencyId: null } }, response);
  assert.equal(response.statusCode, 400);
});

test("invalid role and agency combinations return a client error", async () => {
  const app = fakeApp(); await registerAdminUserRoutes(app as any);
  const response = reply();
  const result = await app.maps.post.get("/api/admin/users")!({
    body: { email: "viewer@example.com", displayName: "Viewer", password: "password1", role: "viewer", agencyId: null },
    admin: { id: "u1", role: "super_admin", jwtSubject: "s1", agencyId: null },
  }, response);
  assert.equal(response.statusCode, 400);
  assert.equal(result.code, "ADMIN_USER_INVALID_ROLE_SCOPE");
});

test("creating a viewer hashes password and returns no hash", async () => {
  const app = fakeApp(); const original = pool.query; let inserted: unknown[] = [];
  (pool.query as any) = async (sql: unknown, values?: unknown[]) => { if (/INSERT INTO admin_users/.test(String(sql))) { inserted = values ?? []; return { rows: [{ id: "u2", email: "viewer@example.com", display_name: "Viewer", password_hash: inserted[2], jwt_subject: "u2", role: "viewer", agency_id: "11111111-1111-4111-8111-111111111111", active: true, created_at: new Date(0), updated_at: new Date(0) }] }; } return { rows: [], rowCount: 1 }; };
  try { await registerAdminUserRoutes(app as any); const result = await app.maps.post.get("/api/admin/users")!({ body: { email: "Viewer@Example.com", displayName: "Viewer", password: "valid password", role: "viewer", agencyId: "11111111-1111-4111-8111-111111111111" }, admin: { id: "u1", role: "super_admin", jwtSubject: "s1", agencyId: null }, id: "r1", log: { error() {} } }, reply()); assert.match(String(inserted[2]), /^scrypt\$/); assert.equal(result.user.email, "viewer@example.com"); assert.equal("password_hash" in result.user, false); } finally { (pool.query as any) = original; }
});

test("updates, password resets, and deactivation emit distinct audits", async () => {
  const source = await import("node:fs/promises").then(fs => fs.readFile(new URL("./users.routes.ts", import.meta.url), "utf8"));
  assert.match(source, /admin_user\.updated/);
  assert.match(source, /admin_user\.password_reset/);
  assert.match(source, /admin_user\.deactivated/);
  assert.match(source, /jwt_subject=CASE WHEN \$4 IS NOT NULL OR \$8=false THEN gen_random_uuid\(\)::text ELSE jwt_subject END/);
  assert.match(source, /active=false, jwt_subject=gen_random_uuid\(\)::text/);
});

test("user write errors map database constraints without leaking internals", () => {
  assert.deepEqual(getAdminUserWriteError({ code: "23505", detail: "secret constraint" }), {
    statusCode: 409,
    code: "ADMIN_USER_EMAIL_EXISTS",
    message: "Email is already in use",
  });
  assert.equal(getAdminUserWriteError(new Error("internal database path")), null);
});

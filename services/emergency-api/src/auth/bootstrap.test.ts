import assert from "node:assert/strict";
import test from "node:test";

import { bootstrapInitialAdmin } from "./bootstrap.js";

test("bootstrap creates one super admin only when no admin exists", async () => {
  const calls: Array<{ sql: string; values?: unknown[] }> = [];
  const execute = async (sql: string, values?: unknown[]) => {
    calls.push({ sql, values });
    if (/SELECT EXISTS/.test(sql)) return { rows: [{ exists: false }], rowCount: 1 };
    return { rows: [], rowCount: 1 };
  };

  const created = await bootstrapInitialAdmin(
    { email: "Admin@Example.com", password: "strong password", displayName: "Admin" },
    execute as any
  );

  assert.equal(created, true);
  assert.ok(calls.some(call => /BEGIN/.test(call.sql)));
  assert.ok(calls.some(call => /pg_advisory_xact_lock/.test(call.sql)));
  assert.ok(calls.some(call => /role='super_admin'.*active=true/.test(call.sql)));
  const insert = calls.find(call => /INSERT INTO admin_users/.test(call.sql));
  assert.ok(insert);
  assert.equal(insert.values?.[0], "admin@example.com");
  assert.equal(insert.values?.[3], "super_admin");
});

test("bootstrap returns false when a concurrent insert wins", async () => {
  let checks = 0;
  const execute = async (sql: string) => {
    if (/SELECT EXISTS/.test(sql)) return { rows: [{ exists: checks++ > 0 }], rowCount: 1 };
    return { rows: [], rowCount: /INSERT INTO/.test(sql) ? 0 : 1 };
  };
  assert.equal(await bootstrapInitialAdmin({ email: "a@b.com", password: "password1", displayName: "A" }, execute as any), false);
});

test("bootstrap fails startup when a conflict leaves no active super admin", async () => {
  const execute = async (sql: string) => ({ rows: /SELECT EXISTS/.test(sql) ? [{ exists: false }] : [], rowCount: /INSERT INTO/.test(sql) ? 0 : 1 });
  await assert.rejects(
    bootstrapInitialAdmin({ email: "a@b.com", password: "password1", displayName: "A" }, execute as any),
    /no active super admin/i
  );
});

test("bootstrap is idempotent when an admin already exists", async () => {
  const calls: string[] = [];
  const execute = async (sql: string) => {
    calls.push(sql);
    return { rows: [{ exists: true }], rowCount: 1 };
  };

  assert.equal(await bootstrapInitialAdmin(
    { email: "admin@example.com", password: "strong password", displayName: "Admin" },
    execute as any
  ), false);
  assert.equal(calls.some(sql => /INSERT INTO admin_users/.test(sql)), false);
});

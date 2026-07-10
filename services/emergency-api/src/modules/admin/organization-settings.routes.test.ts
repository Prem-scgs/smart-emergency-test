/**
 * ???? admin organization settings routes, super_admin guard ??? audit behavior.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { registerAdminOrganizationSettingsRoutes } from "./organization-settings.routes.js";
import { pool } from "../../db.js";

type Handler = (request?: any, reply?: any) => Promise<unknown> | unknown;

function createFakeApp() {
  const getHandlers = new Map<string, Handler>();
  const putHandlers = new Map<string, Handler>();

  return {
    get(path: string, handler: Handler) {
      getHandlers.set(path, handler);
    },
    put(path: string, handler: Handler) {
      putHandlers.set(path, handler);
    },
    getHandlers,
    putHandlers,
  };
}

function createReplyDouble() {
  return {
    statusCode: 200,
    code(statusCode: number) {
      this.statusCode = statusCode;
      return this;
    },
  };
}

test("admin organization settings routes register GET and PUT endpoints", async () => {
  const app = createFakeApp();

  await registerAdminOrganizationSettingsRoutes(app as any);

  assert.equal(typeof app.getHandlers.get("/api/admin/organization-settings"), "function");
  assert.equal(typeof app.putHandlers.get("/api/admin/organization-settings"), "function");
});

test("GET /api/admin/organization-settings is visible to admins", async () => {
  const app = createFakeApp();
  const originalQuery = pool.query.bind(pool);

  (pool.query as any) = async () => ({
    rows: [
      { setting_key: "system_name", setting_value: "Smart Emergency Platform" },
      { setting_key: "organization_name", setting_value: "ศูนย์บัญชาการเหตุฉุกเฉิน" },
      { setting_key: "timezone", setting_value: "Asia/Bangkok" },
    ],
  });

  try {
    await registerAdminOrganizationSettingsRoutes(app as any);
    const handler = app.getHandlers.get("/api/admin/organization-settings");
    assert.ok(handler);

    const agencyReply = createReplyDouble();
    const agencyResult = await handler(
      { headers: { "x-admin-role": "agency_admin", "x-admin-category": "medical" } },
      agencyReply
    ) as any;
    assert.equal(agencyReply.statusCode, 200);
    assert.deepEqual(agencyResult.settings, {
      systemName: "Smart Emergency Platform",
      organizationName: "ศูนย์บัญชาการเหตุฉุกเฉิน",
      timezone: "Asia/Bangkok",
    });

    const superReply = createReplyDouble();
    const superResult = await handler(
      { headers: { "x-admin-role": "super_admin" } },
      superReply
    ) as any;
    assert.equal(superReply.statusCode, 200);
    assert.deepEqual(superResult.settings, {
      systemName: "Smart Emergency Platform",
      organizationName: "ศูนย์บัญชาการเหตุฉุกเฉิน",
      timezone: "Asia/Bangkok",
    });
  } finally {
    (pool.query as any) = originalQuery;
  }
});

test("PUT /api/admin/organization-settings is super admin only", async () => {
  const app = createFakeApp();

  await registerAdminOrganizationSettingsRoutes(app as any);
  const handler = app.putHandlers.get("/api/admin/organization-settings");
  assert.ok(handler);

  const agencyReply = createReplyDouble();
  const agencyResult = await handler(
    {
      headers: { "x-admin-role": "agency_admin", "x-admin-category": "medical" },
      body: {
        settings: {
          systemName: "Emergency Ops",
          organizationName: "ศูนย์ทดสอบ",
          timezone: "Asia/Bangkok",
        },
      },
    },
    agencyReply
  ) as any;

  assert.equal(agencyReply.statusCode, 403);
  assert.equal(agencyResult.code, "ADMIN_ORGANIZATION_SETTINGS_FORBIDDEN");
});

test("PUT /api/admin/organization-settings updates DB and writes audit log", async () => {
  const app = createFakeApp();
  const originalQuery = pool.query.bind(pool);
  const calls: Array<{ sql: string; values?: unknown[] }> = [];

  (pool.query as any) = async (sql: unknown, values?: unknown[]) => {
    calls.push({ sql: String(sql), values });
    if (String(sql).includes("SELECT setting_key")) {
      return {
        rows: [
          { setting_key: "system_name", setting_value: "Emergency Ops" },
          { setting_key: "organization_name", setting_value: "ศูนย์ทดสอบ" },
          { setting_key: "timezone", setting_value: "Asia/Bangkok" },
        ],
      };
    }
    return { rowCount: 1, rows: [] };
  };

  try {
    await registerAdminOrganizationSettingsRoutes(app as any);
    const handler = app.putHandlers.get("/api/admin/organization-settings");
    assert.ok(handler);

    const reply = createReplyDouble();
    const result = await handler(
      {
        id: "request-org-update",
        ip: "127.0.0.1",
        log: { error() {} },
        headers: { "x-admin-role": "super_admin" },
        body: {
          settings: {
            systemName: "Emergency Ops",
            organizationName: "ศูนย์ทดสอบ",
            timezone: "Asia/Bangkok",
          },
        },
      },
      reply
    ) as any;

    assert.equal(reply.statusCode, 200);
    assert.equal(result.saved, true);
    assert.ok(calls.some(call => /INSERT INTO system_settings/.test(call.sql)));
    assert.ok(calls.some(call => /INSERT INTO audit_logs/.test(call.sql)));
  } finally {
    (pool.query as any) = originalQuery;
  }
});

/**
 * ???? admin share channel routes ??? mask recipient ??? audit ????????? secret.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { registerAdminShareChannelRoutes } from "./share-channels.routes.js";
import { pool } from "../../db.js";
import { config } from "../../config.js";

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

test("admin share channel routes register GET and PUT endpoints", async () => {
  const app = createFakeApp();

  await registerAdminShareChannelRoutes(app as any);

  assert.equal(typeof app.getHandlers.get("/api/admin/share-channels"), "function");
  assert.equal(typeof app.putHandlers.get("/api/admin/share-channels"), "function");
});

test("GET /api/admin/share-channels is super admin only and masks recipients", async () => {
  const app = createFakeApp();
  const originalQuery = pool.query.bind(pool);
  const originalChannels = { ...config.shareChannels };
  config.shareChannels.lineOaId = "@smartemergency";
  config.shareChannels.smsCenterPhone = null;
  config.shareChannels.whatsappCenterPhone = null;

  (pool.query as any) = async () => ({
    rows: [
      {
        channel: "sms",
        enabled: true,
        recipient_value: "0812345678",
        updated_by: "operator",
        updated_at: "2026-06-28T00:00:00.000Z",
      },
    ],
  });

  try {
    await registerAdminShareChannelRoutes(app as any);
    const handler = app.getHandlers.get("/api/admin/share-channels");
    assert.ok(handler);

    const agencyReply = createReplyDouble();
    const agencyResult = await handler(
      { headers: { "x-admin-role": "agency_admin", "x-admin-category": "medical" } },
      agencyReply
    );
    assert.equal(agencyReply.statusCode, 403);
    assert.equal((agencyResult as any).code, "ADMIN_SHARE_CHANNEL_FORBIDDEN");

    const superReply = createReplyDouble();
    const superResult = await handler(
      { headers: { "x-admin-role": "super_admin" } },
      superReply
    ) as any;

    assert.equal(superReply.statusCode, 200);
    assert.deepEqual(superResult.channels.line, {
      enabled: true,
      maskedValue: "@sma****",
      source: "env",
    });
    assert.deepEqual(superResult.channels.sms, {
      enabled: true,
      maskedValue: "081***5678",
      source: "db",
    });
    assert.deepEqual(superResult.channels.whatsapp, {
      enabled: false,
      maskedValue: null,
      source: "none",
    });
    assert.doesNotMatch(JSON.stringify(superResult), /0812345678/);
  } finally {
    (pool.query as any) = originalQuery;
    Object.assign(config.shareChannels, originalChannels);
  }
});

test("PUT /api/admin/share-channels updates DB and audits without full recipient", async () => {
  const app = createFakeApp();
  const originalQuery = pool.query.bind(pool);
  const calls: Array<{ sql: string; values?: unknown[] }> = [];

  (pool.query as any) = async (sql: unknown, values?: unknown[]) => {
    calls.push({ sql: String(sql), values });
    if (String(sql).includes("SELECT channel")) {
      return { rows: [] };
    }
    return { rowCount: 1, rows: [] };
  };

  try {
    await registerAdminShareChannelRoutes(app as any);
    const handler = app.putHandlers.get("/api/admin/share-channels");
    assert.ok(handler);

    const reply = createReplyDouble();
    const result = await handler(
      {
        id: "request-channel-update",
        ip: "127.0.0.1",
        log: { error() {} },
        headers: { "x-admin-role": "super_admin" },
        body: {
          channels: {
            line: { enabled: true, recipientValue: "@091ztzlw" },
            sms: { enabled: false },
            whatsapp: { enabled: true, recipientValue: "66812345678" },
          },
        },
      },
      reply
    ) as any;

    assert.equal(reply.statusCode, 200);
    assert.equal(result.saved, true);
    assert.ok(calls.some(call => /INSERT INTO center_share_channels/.test(call.sql)));
    const auditInsert = calls.find(call => /INSERT INTO audit_logs/.test(call.sql));
    assert.ok(auditInsert);
    assert.doesNotMatch(JSON.stringify(auditInsert.values), /@091ztzlw|66812345678/);
  } finally {
    (pool.query as any) = originalQuery;
  }
});

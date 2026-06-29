import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";

import { registerIncidentRoutes } from "./routes.js";
import { pool } from "../../db.js";
import { emergencyEvents } from "../../events.js";
import { config } from "../../config.js";

type Handler = (request?: any, reply?: any) => Promise<unknown> | unknown;

function createFakeApp() {
  const getHandlers = new Map<string, Handler>();
  const postHandlers = new Map<string, Handler>();
  const putHandlers = new Map<string, Handler>();
  const patchHandlers = new Map<string, Handler>();

  return {
    get(path: string, handler: Handler) {
      getHandlers.set(path, handler);
    },
    post(path: string, handler: Handler) {
      postHandlers.set(path, handler);
    },
    put(path: string, handler: Handler) {
      putHandlers.set(path, handler);
    },
    patch(path: string, handler: Handler) {
      patchHandlers.set(path, handler);
    },
    getHandlers,
    postHandlers,
    putHandlers,
    patchHandlers,
  };
}

function createReplyDouble() {
  return {
    statusCode: 200,
    headers: {} as Record<string, string>,
    code(statusCode: number) {
      this.statusCode = statusCode;
      return this;
    },
    header(name: string, value: string) {
      this.headers[name] = value;
      return this;
    },
  };
}

test("registerIncidentRoutes registers GET /api/incidents/:id", async () => {
  const app = createFakeApp();

  await registerIncidentRoutes(app as any);

  assert.equal(typeof app.getHandlers.get("/api/incidents/:id"), "function");
});

test("registerIncidentRoutes registers PUT /api/incidents/:id/call", async () => {
  const app = createFakeApp();

  await registerIncidentRoutes(app as any);

  assert.equal(typeof app.putHandlers.get("/api/incidents/:id/call"), "function");
});

test("registerIncidentRoutes registers PATCH /api/incidents/:id/status", async () => {
  const app = createFakeApp();

  await registerIncidentRoutes(app as any);

  assert.equal(typeof app.patchHandlers.get("/api/incidents/:id/status"), "function");
});

test("registerIncidentRoutes registers GET /api/incidents/:id/events", async () => {
  const app = createFakeApp();

  await registerIncidentRoutes(app as any);

  assert.equal(typeof app.getHandlers.get("/api/incidents/:id/events"), "function");
});

test("registerIncidentRoutes registers POST /api/incidents/:id/share-attempts", async () => {
  const app = createFakeApp();

  await registerIncidentRoutes(app as any);

  assert.equal(
    typeof app.postHandlers.get("/api/incidents/:id/share-attempts"),
    "function"
  );
});

test("POST /api/incidents/:id/share-attempts returns 503 for an unconfigured channel", async () => {
  const app = createFakeApp();
  const originalChannels = { ...config.shareChannels };
  config.shareChannels.smsCenterPhone = null;

  try {
    await registerIncidentRoutes(app as any);
    const handler = app.postHandlers.get("/api/incidents/:id/share-attempts");
    assert.ok(handler);

    const reply = createReplyDouble();
    const result = await handler({
      id: "request-share-disabled",
      ip: "127.0.0.1",
      log: { error() {} },
      params: { id: "77777777-7777-4777-8777-777777777777" },
      body: { sessionId: "session-share-disabled", channel: "sms" },
    }, reply);

    assert.equal(reply.statusCode, 503);
    assert.equal((result as any).code, "SHARE_CHANNEL_NOT_CONFIGURED");
  } finally {
    Object.assign(config.shareChannels, originalChannels);
  }
});

test("POST /api/incidents/:id/share-attempts validates ownership and records the attempt", async () => {
  const app = createFakeApp();
  const originalQuery = pool.query.bind(pool);
  const originalChannels = { ...config.shareChannels };
  const calls: Array<{ sql: string; values?: unknown[] }> = [];
  config.shareChannels.smsCenterPhone = "0812345678";
  (pool.query as any) = async (sql: unknown, values?: unknown[]) => {
    calls.push({ sql: String(sql), values });
    if (String(sql).includes("FROM center_share_channels")) {
      return { rows: [] };
    }
    if (String(sql).includes("FROM incidents")) {
      return {
        rows: [{
          id: "77777777-7777-4777-8777-777777777777",
          category: "medical",
          province: "กรุงเทพมหานคร",
          district: "ปทุมวัน",
          latitude: 13.7478,
          longitude: 100.5351,
          created_at: "2026-06-21T03:42:00.000Z",
        }],
      };
    }
    return { rowCount: 1, rows: [] };
  };

  try {
    await registerIncidentRoutes(app as any);
    const handler = app.postHandlers.get("/api/incidents/:id/share-attempts");
    assert.ok(handler);

    const reply = createReplyDouble();
    const result = await handler({
      id: "request-share-success",
      ip: "127.0.0.1",
      log: { error() {} },
      headers: { "x-mobile-platform": "android" },
      params: { id: "77777777-7777-4777-8777-777777777777" },
      body: {
        sessionId: "session-share-success",
        channel: "sms",
        reporterPhone: "0811111111",
      },
    }, reply) as any;

    assert.equal(reply.statusCode, 200);
    assert.equal(result.recorded, true);
    assert.equal(result.channel, "sms");
    assert.match(result.shareUrl, /^sms:0812345678\?body=/);
    assert.match(result.message, /เบอร์ผู้แจ้ง: 0811111111/);
    assert.match(result.mapsUrl, /13\.747800,100\.535100/);
    const incidentSelect = calls.find(call => /FROM incidents/.test(call.sql));
    assert.deepEqual(incidentSelect?.values, [
      "77777777-7777-4777-8777-777777777777",
      "session-share-success",
    ]);
    const auditInsert = calls.find(call => /INSERT INTO audit_logs/.test(call.sql));
    assert.ok(auditInsert);
    assert.doesNotMatch(JSON.stringify(auditInsert.values), /0811111111/);
  } finally {
    (pool.query as any) = originalQuery;
    Object.assign(config.shareChannels, originalChannels);
  }
});

test("POST /api/incidents/:id/share-attempts uses DB channel recipient before env fallback", async () => {
  const app = createFakeApp();
  const originalQuery = pool.query.bind(pool);
  const originalChannels = { ...config.shareChannels };
  const calls: Array<{ sql: string; values?: unknown[] }> = [];
  config.shareChannels.smsCenterPhone = null;

  (pool.query as any) = async (sql: unknown, values?: unknown[]) => {
    calls.push({ sql: String(sql), values });
    const sqlText = String(sql);

    if (sqlText.includes("FROM center_share_channels")) {
      return {
        rows: [
          { channel: "sms", enabled: true, recipient_value: "0899999999" },
        ],
      };
    }

    if (sqlText.includes("FROM incidents")) {
      return {
        rows: [{
          id: "77777777-7777-4777-8777-777777777778",
          category: "medical",
          province: "กรุงเทพมหานคร",
          district: "ปทุมวัน",
          latitude: 13.7478,
          longitude: 100.5351,
          created_at: "2026-06-21T03:42:00.000Z",
        }],
      };
    }

    return { rowCount: 1, rows: [] };
  };

  try {
    await registerIncidentRoutes(app as any);
    const handler = app.postHandlers.get("/api/incidents/:id/share-attempts");
    assert.ok(handler);

    const reply = createReplyDouble();
    const result = await handler({
      id: "request-share-db-channel",
      ip: "127.0.0.20",
      log: { error() {} },
      headers: { "x-mobile-platform": "android" },
      params: { id: "77777777-7777-4777-8777-777777777778" },
      body: {
        sessionId: "session-share-db-channel",
        channel: "sms",
      },
    }, reply) as any;

    assert.equal(reply.statusCode, 200);
    assert.match(result.shareUrl, /^sms:0899999999\?body=/);
    assert.match(calls[0]?.sql ?? "", /FROM center_share_channels/);
  } finally {
    (pool.query as any) = originalQuery;
    Object.assign(config.shareChannels, originalChannels);
  }
});

test("POST /api/incidents/:id/share-attempts returns recorded false when audit fails", async () => {
  const app = createFakeApp();
  const originalQuery = pool.query.bind(pool);
  const originalChannels = { ...config.shareChannels };
  config.shareChannels.lineOaId = "@smartemergency";
  (pool.query as any) = async (sql: unknown) => {
    const sqlText = String(sql);
    if (sqlText.includes("FROM center_share_channels")) {
      return { rows: [] };
    }
    if (sqlText.includes("FROM incidents")) {
      return {
        rows: [{
          id: "88888888-8888-4888-8888-888888888888",
          category: "fire",
          province: null,
          district: null,
          latitude: 13.7,
          longitude: 100.5,
          created_at: "2026-06-21T03:42:00.000Z",
        }],
      };
    }
    throw new Error("audit unavailable");
  };

  try {
    await registerIncidentRoutes(app as any);
    const handler = app.postHandlers.get("/api/incidents/:id/share-attempts");
    assert.ok(handler);
    const result = await handler({
      id: "request-share-audit-fail",
      ip: "127.0.0.2",
      log: { error() {} },
      headers: { "x-mobile-platform": "ios" },
      params: { id: "88888888-8888-4888-8888-888888888888" },
      body: { sessionId: "session-share-audit-fail", channel: "line" },
    }, createReplyDouble()) as any;

    assert.equal(result.recorded, false);
    assert.match(result.shareUrl, /^https:\/\/line\.me/);
  } finally {
    (pool.query as any) = originalQuery;
    Object.assign(config.shareChannels, originalChannels);
  }
});

test("POST /api/incidents/:id/share-attempts returns 404 for a different reporter session", async () => {
  const app = createFakeApp();
  const originalQuery = pool.query.bind(pool);
  const originalChannels = { ...config.shareChannels };
  config.shareChannels.whatsappCenterPhone = "66812345678";
  (pool.query as any) = async () => ({ rows: [] });

  try {
    await registerIncidentRoutes(app as any);
    const handler = app.postHandlers.get("/api/incidents/:id/share-attempts");
    assert.ok(handler);
    const reply = createReplyDouble();
    const result = await handler({
      id: "request-share-wrong-session",
      ip: "127.0.0.3",
      log: { error() {} },
      headers: {},
      params: { id: "99999999-9999-4999-8999-999999999999" },
      body: { sessionId: "session-share-wrong", channel: "whatsapp" },
    }, reply);

    assert.equal(reply.statusCode, 404);
    assert.equal((result as any).code, "INCIDENT_NOT_FOUND");
  } finally {
    (pool.query as any) = originalQuery;
    Object.assign(config.shareChannels, originalChannels);
  }
});

test("POST /api/incidents/:id/share-attempts rate limits the eleventh attempt", async () => {
  const app = createFakeApp();
  const originalQuery = pool.query.bind(pool);
  const originalChannels = { ...config.shareChannels };
  config.shareChannels.smsCenterPhone = "0812345678";
  (pool.query as any) = async (sql: unknown) => {
    if (String(sql).includes("FROM incidents")) {
      return {
        rows: [{
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          category: "medical",
          province: null,
          district: null,
          latitude: 13.7,
          longitude: 100.5,
          created_at: "2026-06-21T03:42:00.000Z",
        }],
      };
    }
    return { rowCount: 1, rows: [] };
  };

  try {
    await registerIncidentRoutes(app as any);
    const handler = app.postHandlers.get("/api/incidents/:id/share-attempts");
    assert.ok(handler);

    for (let attempt = 1; attempt <= 10; attempt += 1) {
      const reply = createReplyDouble();
      await handler({
        id: `request-rate-${attempt}`,
        ip: "127.0.0.10",
        log: { error() {} },
        headers: {},
        params: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
        body: { sessionId: "session-rate-limit", channel: "sms" },
      }, reply);
      assert.equal(reply.statusCode, 200);
    }

    const blockedReply = createReplyDouble();
    const result = await handler({
      id: "request-rate-11",
      ip: "127.0.0.10",
      log: { error() {} },
      headers: {},
      params: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
      body: { sessionId: "session-rate-limit", channel: "sms" },
    }, blockedReply);

    assert.equal(blockedReply.statusCode, 429);
    assert.equal((result as any).code, "SHARE_RATE_LIMIT_EXCEEDED");
    assert.ok(Number(blockedReply.headers["Retry-After"]) >= 1);
  } finally {
    (pool.query as any) = originalQuery;
    Object.assign(config.shareChannels, originalChannels);
  }
});

test("GET /api/incidents/:id/events rejects a reporter session that does not own the incident", async () => {
  const app = createFakeApp();
  const originalQuery = pool.query.bind(pool);
  (pool.query as unknown as typeof originalQuery) = async () => ({ rows: [] } as any);

  try {
    await registerIncidentRoutes(app as any);
    const handler = app.getHandlers.get("/api/incidents/:id/events");
    assert.ok(handler);

    const reply = createReplyDouble();
    const result = await handler({
      params: { id: "incident-mobile-1" },
      query: { sessionId: "session-wrong-123" },
    }, reply);

    assert.equal(reply.statusCode, 403);
    assert.equal((result as any).code, "INCIDENT_TRACKING_ACCESS_DENIED");
  } finally {
    (pool.query as unknown as typeof originalQuery) = originalQuery;
  }
});

test("GET /api/incidents/:id/events streams status updates for only the owned incident", async () => {
  const app = createFakeApp();
  const originalQuery = pool.query.bind(pool);
  (pool.query as unknown as typeof originalQuery) = async (sql: any, values?: any) => {
    assert.match(String(sql), /session_id = \$2/);
    assert.deepEqual(values, ["incident-mobile-1", "session-mobile-123"]);
    return { rows: [{ id: "incident-mobile-1" }] } as any;
  };

  class RawReplyDouble extends EventEmitter {
    chunks: string[] = [];

    writeHead() {}
    flushHeaders() {}
    write(chunk: string) {
      this.chunks.push(chunk);
      return true;
    }
  }

  const raw = new RawReplyDouble();
  const reply = {
    hijack() {},
    raw,
  };

  try {
    await registerIncidentRoutes(app as any);
    const handler = app.getHandlers.get("/api/incidents/:id/events");
    assert.ok(handler);

    await handler({
      params: { id: "incident-mobile-1" },
      query: { sessionId: "session-mobile-123" },
    }, reply);

    emergencyEvents.emit("incident.status_updated", {
      id: "incident-mobile-1",
      category: "medical",
      status: "acknowledged",
      statusVersion: 1,
    });
    emergencyEvents.emit("incident.status_updated", {
      id: "incident-other",
      category: "medical",
      status: "acknowledged",
      statusVersion: 1,
    });
    raw.emit("close");

    const output = raw.chunks.join("");
    assert.match(output, /event: incident\.status_updated/);
    assert.match(output, /incident-mobile-1/);
    assert.doesNotMatch(output, /incident-other/);
  } finally {
    raw.emit("close");
    (pool.query as unknown as typeof originalQuery) = originalQuery;
  }
});

test("PATCH /api/incidents/:id/status commits status history before emitting SSE", async () => {
  const app = createFakeApp();
  const originalConnect = pool.connect.bind(pool);
  const operations: string[] = [];
  const updatedAt = new Date("2026-06-19T05:00:00.000Z");
  const client = {
    async query(sql: string, values?: unknown[]) {
      const normalizedSql = sql.trim();
      operations.push(normalizedSql.split(/\s+/).slice(0, 3).join(" "));

      if (normalizedSql === "BEGIN" || normalizedSql === "COMMIT" || normalizedSql === "ROLLBACK") {
        return { rows: [] };
      }

      if (normalizedSql.includes("FOR UPDATE")) {
        return {
          rows: [{
            id: "incident-status-1",
            category: "medical",
            status: "reported",
            status_version: 0,
          }],
        };
      }

      if (normalizedSql.startsWith("UPDATE incidents")) {
        assert.deepEqual(values, ["acknowledged", "incident-status-1", 0]);
        return {
          rows: [{
            id: "incident-status-1",
            category: "medical",
            status: "acknowledged",
            status_version: 1,
            updated_at: updatedAt,
          }],
        };
      }

      if (normalizedSql.startsWith("INSERT INTO incident_status_history")) {
        assert.deepEqual(values, [
          "incident-status-1",
          "reported",
          "acknowledged",
          null,
          "agency_admin",
          1,
        ]);
        return { rows: [] };
      }

      throw new Error(`Unexpected SQL: ${normalizedSql}`);
    },
    release() {
      operations.push("RELEASE");
    },
  };
  (pool.connect as unknown as () => Promise<typeof client>) = async () => client;

  let emittedPayload: unknown;
  const onStatusUpdated = (payload: unknown) => {
    operations.push("EVENT");
    emittedPayload = payload;
  };
  emergencyEvents.on("incident.status_updated", onStatusUpdated);

  try {
    await registerIncidentRoutes(app as any);
    const handler = app.patchHandlers.get("/api/incidents/:id/status");
    assert.ok(handler);

    const result = await handler({
      params: { id: "incident-status-1" },
      headers: {
        "x-admin-role": "agency_admin",
        "x-admin-category": "medical",
      },
      query: {},
      body: {
        fromStatus: "reported",
        toStatus: "acknowledged",
        expectedVersion: 0,
      },
    }, createReplyDouble());

    assert.ok(operations.indexOf("COMMIT") < operations.indexOf("EVENT"));
    assert.deepEqual(result, {
      id: "incident-status-1",
      category: "medical",
      fromStatus: "reported",
      status: "acknowledged",
      statusVersion: 1,
      note: null,
      updatedAt,
    });
    assert.deepEqual(emittedPayload, result);
  } finally {
    emergencyEvents.off("incident.status_updated", onStatusUpdated);
    (pool.connect as unknown as typeof originalConnect) = originalConnect;
  }
});

test("PATCH /api/incidents/:id/status returns 409 for a stale expectedVersion", async () => {
  const app = createFakeApp();
  const originalConnect = pool.connect.bind(pool);
  const operations: string[] = [];
  const client = {
    async query(sql: string) {
      const normalizedSql = sql.trim();
      operations.push(normalizedSql);

      if (normalizedSql === "BEGIN" || normalizedSql === "ROLLBACK") {
        return { rows: [] };
      }

      if (normalizedSql.includes("FOR UPDATE")) {
        return {
          rows: [{
            id: "incident-status-1",
            category: "medical",
            status: "acknowledged",
            status_version: 1,
          }],
        };
      }

      throw new Error(`Unexpected SQL: ${normalizedSql}`);
    },
    release() {},
  };
  (pool.connect as unknown as () => Promise<typeof client>) = async () => client;

  let eventCount = 0;
  const onStatusUpdated = () => {
    eventCount += 1;
  };
  emergencyEvents.on("incident.status_updated", onStatusUpdated);

  try {
    await registerIncidentRoutes(app as any);
    const handler = app.patchHandlers.get("/api/incidents/:id/status");
    assert.ok(handler);

    const reply = createReplyDouble();
    const result = await handler({
      params: { id: "incident-status-1" },
      headers: { "x-admin-role": "super_admin" },
      query: {},
      body: {
        fromStatus: "reported",
        toStatus: "acknowledged",
        expectedVersion: 0,
      },
    }, reply);

    assert.equal(reply.statusCode, 409);
    assert.equal((result as any).code, "INCIDENT_STATUS_CONFLICT");
    assert.deepEqual((result as any).currentState, {
      status: "acknowledged",
      statusVersion: 1,
    });
    assert.ok(operations.includes("ROLLBACK"));
    assert.equal(eventCount, 0);
  } finally {
    emergencyEvents.off("incident.status_updated", onStatusUpdated);
    (pool.connect as unknown as typeof originalConnect) = originalConnect;
  }
});

test("GET /api/events streams status updates allowed by agency scope", async () => {
  const app = createFakeApp();
  await registerIncidentRoutes(app as any);

  const handler = app.getHandlers.get("/api/events");
  assert.ok(handler);

  class RawReplyDouble extends EventEmitter {
    chunks: string[] = [];

    writeHead() {}
    flushHeaders() {}
    write(chunk: string) {
      this.chunks.push(chunk);
      return true;
    }
  }

  const raw = new RawReplyDouble();
  const reply = {
    hijack() {},
    raw,
  };

  await handler({
    headers: {
      "x-admin-role": "agency_admin",
      "x-admin-category": "medical",
    },
    query: {},
  }, reply);

  emergencyEvents.emit("incident.status_updated", {
    id: "incident-medical",
    category: "medical",
    status: "acknowledged",
    statusVersion: 1,
  });
  emergencyEvents.emit("incident.status_updated", {
    id: "incident-fire",
    category: "fire",
    status: "acknowledged",
    statusVersion: 1,
  });
  raw.emit("close");

  const output = raw.chunks.join("");
  assert.match(output, /event: incident\.status_updated/);
  assert.match(output, /incident-medical/);
  assert.doesNotMatch(output, /incident-fire/);
});

test("GET /api/events sends a proxy-flushing prelude before realtime events", async () => {
  const app = createFakeApp();
  await registerIncidentRoutes(app as any);

  const handler = app.getHandlers.get("/api/events");
  assert.ok(handler);

  class RawReplyDouble extends EventEmitter {
    chunks: string[] = [];

    writeHead() {}
    flushHeaders() {}
    write(chunk: string) {
      this.chunks.push(chunk);
      return true;
    }
  }

  const raw = new RawReplyDouble();
  const reply = {
    hijack() {},
    raw,
  };

  await handler(
    {
      headers: {
        "x-admin-role": "super_admin",
      },
      query: {},
    },
    reply
  );
  raw.emit("close");

  const output = raw.chunks.join("");
  assert.match(output, /^: {2048,}\n\nretry: 2000\n: connected\n\n/);
});

test("GET /api/incidents scopes agency admin to their own category on the server side", async () => {
  const app = createFakeApp();
  const queryMock = pool.query as unknown as (...args: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
  const originalQuery = queryMock.bind(pool);

  await registerIncidentRoutes(app as any);

  const handler = app.getHandlers.get("/api/incidents");
  assert.ok(handler);

  const calls: unknown[][] = [];
  (pool.query as unknown as typeof queryMock) = (async (...args: unknown[]) => {
    calls.push(args);
    return { rows: [] };
  }) as typeof queryMock;

  try {
    const result = await handler?.({
      headers: {
        "x-admin-role": "agency_admin",
        "x-admin-category": "medical",
      },
    });

    assert.equal(calls.length, 1);
    assert.match(String(calls[0]?.[0]), /WHERE i\.category = \$1/);
    assert.deepEqual(calls[0]?.[1], ["medical"]);
    assert.deepEqual(result, []);
  } finally {
    (pool.query as unknown as typeof queryMock) = originalQuery as typeof queryMock;
  }
});

test("GET /api/incidents/:id returns a mapped incident", async () => {
  const app = createFakeApp();
  const queryMock = pool.query as unknown as (...args: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
  const originalQuery = queryMock.bind(pool);

  await registerIncidentRoutes(app as any);

  const handler = app.getHandlers.get("/api/incidents/:id");
  assert.ok(handler);

  const calls: unknown[][] = [];
  (pool.query as unknown as typeof queryMock) = (async (...args: unknown[]) => {
    calls.push(args);
    return {
      rows: [
        {
          id: "incident-1",
          category: "fire",
          severity: "high",
          status: "open",
          description: "Smoke reported",
          agency_contact_id: "contact-1",
          agency_name: "Fire Department",
          agency_phone: "199",
          province_code: "10",
          province: "Bangkok",
          district_code: "1007",
          district: "Pathum Wan",
          accuracy: 15,
          call_status: "connected",
          reporter_phone: "0812345678",
          session_id: "session-12345678",
          latitude: 13.7478,
          longitude: 100.5351,
          marker_color: "#f97316",
          created_at: new Date("2026-06-13T00:00:00.000Z"),
          updated_at: new Date("2026-06-13T00:05:00.000Z"),
        },
      ],
    };
  }) as typeof queryMock;

  try {
    const result = await handler?.({ params: { id: "incident-1" } }, createReplyDouble());

    assert.equal(calls.length, 1);
    assert.match(String(calls[0]?.[0]), /WHERE i\.id = \$1/);
    assert.deepEqual(calls[0]?.[1], ["incident-1"]);
    assert.deepEqual(result, {
      id: "incident-1",
      category: "fire",
      severity: "high",
      status: "open",
      description: "Smoke reported",
      agencyContactId: "contact-1",
      agencyName: "Fire Department",
      agencyPhone: "199",
      provinceCode: "10",
      province: "Bangkok",
      districtCode: "1007",
      district: "Pathum Wan",
      accuracy: 15,
      callStatus: "connected",
      reporterPhone: "0812345678",
      sessionId: "session-12345678",
      latitude: 13.7478,
      longitude: 100.5351,
      markerColor: "#f97316",
      areaId: undefined,
      areaName: undefined,
      areaColor: undefined,
      createdAt: new Date("2026-06-13T00:00:00.000Z"),
      updatedAt: new Date("2026-06-13T00:05:00.000Z"),
    });
  } finally {
    (pool.query as unknown as typeof queryMock) = originalQuery as typeof queryMock;
  }
});

test("GET /api/incidents/:id returns 404 when incident is missing", async () => {
  const app = createFakeApp();
  const queryMock = pool.query as unknown as (...args: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
  const originalQuery = queryMock.bind(pool);

  await registerIncidentRoutes(app as any);

  const handler = app.getHandlers.get("/api/incidents/:id");
  assert.ok(handler);

  (pool.query as unknown as typeof queryMock) = (async () => ({ rows: [] })) as typeof queryMock;

  try {
    const reply = createReplyDouble();
    const result = await handler?.({ params: { id: "missing-incident" } }, reply);

    assert.equal(reply.statusCode, 404);
    assert.deepEqual(result, {
      error: "Incident not found",
      code: "INCIDENT_NOT_FOUND",
      statusCode: 404,
    });
  } finally {
    (pool.query as unknown as typeof queryMock) = originalQuery as typeof queryMock;
  }
});

test("GET /api/incidents/:id returns standardized validation error for invalid params", async () => {
  const app = createFakeApp();

  await registerIncidentRoutes(app as any);

  const handler = app.getHandlers.get("/api/incidents/:id");
  assert.ok(handler);

  const reply = createReplyDouble();
  const result = await handler?.({ params: { id: "" } }, reply);

  assert.equal(reply.statusCode, 400);
  assert.equal((result as any).code, "VALIDATION_ERROR");
  assert.equal((result as any).statusCode, 400);
  assert.ok(Array.isArray((result as any).issues));
});

test("POST /api/incidents writes an audit log after create", async () => {
  const app = createFakeApp();
  const queryMock = pool.query as unknown as (...args: unknown[]) => Promise<{ rowCount?: number; rows: Record<string, unknown>[] }>;
  const originalQuery = queryMock.bind(pool);

  await registerIncidentRoutes(app as any);

  const handler = app.postHandlers.get("/api/incidents");
  assert.ok(handler);

  const calls: unknown[][] = [];
  (pool.query as unknown as typeof queryMock) = (async (...args: unknown[]) => {
    calls.push(args);

    if (calls.length === 1) {
      return { rowCount: 1, rows: [{ "?column?": 1 }] };
    }

    if (calls.length === 2) {
      return { rowCount: 0, rows: [] };
    }

    if (calls.length === 3) {
      return {
        rowCount: 1,
        rows: [
          {
            id: "incident-1",
            client_request_id: "33333333-3333-4333-8333-333333333333",
            dialed_phone: "199",
            category: "fire",
            severity: "high",
            status: "open",
            description: "Smoke reported",
            province_code: "10",
            province: "Bangkok",
            district_code: "1007",
            district: "Pathum Wan",
            accuracy: 15,
            call_status: "connected",
            reporter_phone: "0812345678",
            session_id: "session-12345678",
            latitude: 13.7478,
            longitude: 100.5351,
            marker_color: "#f97316",
            created_at: new Date("2026-06-13T00:00:00.000Z"),
            updated_at: new Date("2026-06-13T00:00:00.000Z"),
            was_created: true,
          },
        ],
      };
    }

    if (calls.length === 4) {
      return { rowCount: 1, rows: [] };
    }

    return { rowCount: 1, rows: [] };
  }) as typeof queryMock;

  try {
    const reply = createReplyDouble();
    const result = await handler?.(
      {
        id: "req-incident-create",
        ip: "127.0.0.1",
        log: { error() {} },
        body: {
          clientRequestId: "33333333-3333-4333-8333-333333333333",
          dialedPhone: "199",
          category: "fire",
          severity: "high",
          status: "open",
          description: "Smoke reported",
          latitude: 13.7478,
          longitude: 100.5351,
          accuracy: 15,
          callStatus: "connected",
          reporterPhone: "0812345678",
          sessionId: "session-12345678",
        },
      },
      reply
    );

    assert.equal(reply.statusCode, 201);
    assert.equal(calls.length, 4);
    assert.match(String(calls[3]?.[0]), /INSERT INTO audit_logs/);
    assert.equal((result as any).id, "incident-1");
  } finally {
    (pool.query as unknown as typeof queryMock) = originalQuery as typeof queryMock;
  }
});

test("registerIncidentRoutes registers GET /api/incidents/:id/tracking", async () => {
  const app = createFakeApp();

  await registerIncidentRoutes(app as any);

  assert.equal(typeof app.getHandlers.get("/api/incidents/:id/tracking"), "function");
});

test("GET /api/incidents/:id/tracking returns tracking data for the owning reporter session", async () => {
  const app = createFakeApp();
  const queryMock = pool.query as unknown as (...args: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
  const originalQuery = queryMock.bind(pool);

  await registerIncidentRoutes(app as any);

  const handler = app.getHandlers.get("/api/incidents/:id/tracking");
  assert.ok(handler);

  const calls: unknown[][] = [];
  (pool.query as unknown as typeof queryMock) = (async (...args: unknown[]) => {
    calls.push(args);
    return {
      rows: [{
        id: "incident-1",
        client_request_id: "11111111-1111-4111-8111-111111111111",
        dialed_phone: "1669",
        category: "medical",
        severity: "high",
        status: "acknowledged",
        status_version: 1,
        description: null,
        agency_contact_id: "contact-1",
        agency_name: "Emergency Medical Services",
        agency_phone: "1669",
        province_code: "65",
        province: "Phitsanulok",
        district_code: "6501",
        district: "Mueang Phitsanulok",
        accuracy: 12,
        call_status: null,
        reporter_phone: null,
        session_id: "session-owner-1234",
        latitude: 16.8211,
        longitude: 100.2659,
        marker_color: "#f97316",
        created_at: new Date("2026-06-18T10:00:00.000Z"),
        updated_at: new Date("2026-06-18T10:05:00.000Z"),
        status_history: [{
          id: "status-1",
          fromStatus: "reported",
          toStatus: "acknowledged",
          note: null,
          changedByAdminId: "admin-1",
          changedByRole: "agency_admin",
          statusVersion: 1,
          createdAt: "2026-06-18T10:05:00.000Z",
        }],
        latest_location: {
          id: "location-1",
          latitude: 16.8211,
          longitude: 100.2659,
          accuracy: 12,
          source: "initial",
          createdAt: "2026-06-18T10:00:00.000Z",
        },
        location_history: [{
          id: "location-1",
          latitude: 16.8211,
          longitude: 100.2659,
          accuracy: 12,
          source: "initial",
          createdAt: "2026-06-18T10:00:00.000Z",
        }],
      }],
    };
  }) as typeof queryMock;

  try {
    const result = await handler?.({
      params: { id: "incident-1" },
      query: { sessionId: "session-owner-1234" },
      headers: {},
    }, createReplyDouble());

    assert.equal(calls.length, 1);
    assert.match(String(calls[0]?.[0]), /i\.session_id = \$2/);
    assert.deepEqual(calls[0]?.[1], ["incident-1", "session-owner-1234"]);
    assert.equal((result as any).incident.status, "acknowledged");
    assert.equal((result as any).incident.statusVersion, 1);
    assert.equal((result as any).statusHistory[0].toStatus, "acknowledged");
    assert.equal((result as any).latestLocation.source, "initial");
    assert.equal((result as any).locationHistory.length, 1);
  } finally {
    (pool.query as unknown as typeof queryMock) = originalQuery as typeof queryMock;
  }
});

test("GET /api/incidents/:id/tracking scopes agency admin to their category", async () => {
  const app = createFakeApp();
  const queryMock = pool.query as unknown as (...args: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
  const originalQuery = queryMock.bind(pool);

  await registerIncidentRoutes(app as any);
  const handler = app.getHandlers.get("/api/incidents/:id/tracking");
  assert.ok(handler);

  const calls: unknown[][] = [];
  (pool.query as unknown as typeof queryMock) = (async (...args: unknown[]) => {
    calls.push(args);
    return { rows: [] };
  }) as typeof queryMock;

  try {
    const reply = createReplyDouble();
    const result = await handler?.({
      params: { id: "incident-1" },
      query: {},
      headers: {
        "x-admin-role": "agency_admin",
        "x-admin-category": "medical",
      },
    }, reply);

    assert.match(String(calls[0]?.[0]), /i\.category = \$2/);
    assert.deepEqual(calls[0]?.[1], ["incident-1", "medical"]);
    assert.equal(reply.statusCode, 404);
    assert.equal((result as any).code, "INCIDENT_NOT_FOUND");
  } finally {
    (pool.query as unknown as typeof queryMock) = originalQuery as typeof queryMock;
  }
});

test("GET /api/incidents/:id/tracking rejects requests without reporter session or admin scope", async () => {
  const app = createFakeApp();
  await registerIncidentRoutes(app as any);

  const handler = app.getHandlers.get("/api/incidents/:id/tracking");
  assert.ok(handler);

  const reply = createReplyDouble();
  const result = await handler?.({
    params: { id: "incident-1" },
    query: {},
    headers: {},
  }, reply);

  assert.equal(reply.statusCode, 403);
  assert.equal((result as any).code, "INCIDENT_TRACKING_ACCESS_DENIED");
});

test("POST /api/incidents persists request identity, dialed phone, and initial histories atomically", async () => {
  const app = createFakeApp();
  const queryMock = pool.query as unknown as (...args: unknown[]) => Promise<{ rowCount?: number; rows: Record<string, unknown>[] }>;
  const originalQuery = queryMock.bind(pool);

  await registerIncidentRoutes(app as any);

  const handler = app.postHandlers.get("/api/incidents");
  assert.ok(handler);

  const calls: unknown[][] = [];
  (pool.query as unknown as typeof queryMock) = (async (...args: unknown[]) => {
    calls.push(args);

    if (calls.length === 1) return { rowCount: 1, rows: [{ "?column?": 1 }] };
    if (calls.length === 2) return { rowCount: 0, rows: [] };
    if (calls.length === 3) {
      return {
        rowCount: 1,
        rows: [{
          id: "incident-atomic-1",
          client_request_id: "11111111-1111-4111-8111-111111111111",
          dialed_phone: "1669",
          category: "medical",
          severity: "high",
          status: "reported",
          status_version: 0,
          latitude: 16.8369,
          longitude: 100.2365,
          was_created: true,
        }],
      };
    }

    return { rowCount: 1, rows: [] };
  }) as typeof queryMock;

  try {
    const reply = createReplyDouble();
    const result = await handler?.({
      id: "req-atomic-create",
      ip: "127.0.0.21",
      log: { error() {} },
      body: {
        clientRequestId: "11111111-1111-4111-8111-111111111111",
        dialedPhone: "1669",
        category: "medical",
        severity: "high",
        latitude: 16.8369,
        longitude: 100.2365,
        accuracy: 12,
        sessionId: "session-atomic-1234",
      },
    }, reply);

    assert.equal(reply.statusCode, 201);
    assert.equal((result as any).clientRequestId, "11111111-1111-4111-8111-111111111111");
    assert.equal((result as any).dialedPhone, "1669");

    const createSql = String(calls[2]?.[0]);
    assert.match(createSql, /client_request_id/);
    assert.match(createSql, /dialed_phone/);
    assert.match(createSql, /INSERT INTO incident_status_history/);
    assert.match(createSql, /INSERT INTO incident_location_history/);
    assert.match(createSql, /ON CONFLICT/);
    assert.ok((calls[2]?.[1] as unknown[]).includes("11111111-1111-4111-8111-111111111111"));
    assert.ok((calls[2]?.[1] as unknown[]).includes("1669"));
  } finally {
    (pool.query as unknown as typeof queryMock) = originalQuery as typeof queryMock;
  }
});

test("POST /api/incidents returns an existing incident without duplicate audit or SSE", async () => {
  const app = createFakeApp();
  const queryMock = pool.query as unknown as (...args: unknown[]) => Promise<{ rowCount?: number; rows: Record<string, unknown>[] }>;
  const originalQuery = queryMock.bind(pool);

  await registerIncidentRoutes(app as any);

  const handler = app.postHandlers.get("/api/incidents");
  assert.ok(handler);

  const calls: unknown[][] = [];
  (pool.query as unknown as typeof queryMock) = (async (...args: unknown[]) => {
    calls.push(args);

    if (calls.length === 1) return { rowCount: 1, rows: [{ "?column?": 1 }] };
    if (calls.length === 2) return { rowCount: 0, rows: [] };
    if (calls.length === 3) {
      return {
        rowCount: 1,
        rows: [{
          id: "incident-existing-1",
          client_request_id: "22222222-2222-4222-8222-222222222222",
          dialed_phone: "191",
          category: "police",
          severity: "medium",
          status: "reported",
          status_version: 0,
          latitude: 13.7563,
          longitude: 100.5018,
          was_created: false,
        }],
      };
    }

    return { rowCount: 1, rows: [] };
  }) as typeof queryMock;

  let eventCount = 0;
  const onIncidentCreated = () => {
    eventCount += 1;
  };
  emergencyEvents.on("incident.created", onIncidentCreated);

  try {
    const reply = createReplyDouble();
    const result = await handler?.({
      id: "req-idempotent-retry",
      ip: "127.0.0.22",
      log: { error() {} },
      body: {
        clientRequestId: "22222222-2222-4222-8222-222222222222",
        dialedPhone: "191",
        category: "police",
        severity: "medium",
        latitude: 13.7563,
        longitude: 100.5018,
        sessionId: "session-retry-1234",
      },
    }, reply);

    assert.equal(reply.statusCode, 200);
    assert.equal((result as any).id, "incident-existing-1");
    assert.equal(calls.length, 3);
    assert.equal(eventCount, 0);
  } finally {
    emergencyEvents.off("incident.created", onIncidentCreated);
    (pool.query as unknown as typeof queryMock) = originalQuery as typeof queryMock;
  }
});

test("POST /api/incidents returns 400 for invalid reporter phone", async () => {
  const app = createFakeApp();

  await registerIncidentRoutes(app as any);

  const handler = app.postHandlers.get("/api/incidents");
  assert.ok(handler);

  const reply = createReplyDouble();
  const result = await handler?.(
    {
      ip: "127.0.0.1",
      body: {
        clientRequestId: "44444444-4444-4444-8444-444444444444",
        dialedPhone: "199",
        category: "fire",
        severity: "high",
        status: "open",
        latitude: 13.7478,
        longitude: 100.5351,
        reporterPhone: "abc",
        sessionId: "session-12345678",
      },
    },
    reply
  );

  assert.equal(reply.statusCode, 400);
  assert.deepEqual(result, {
    error: "Reporter phone number is invalid",
    code: "INVALID_PHONE_NUMBER",
    statusCode: 400,
  });
});

test("POST /api/incidents returns 400 for unknown district code", async () => {
  const app = createFakeApp();
  const queryMock = pool.query as unknown as (...args: unknown[]) => Promise<{ rowCount?: number; rows: Record<string, unknown>[] }>;
  const originalQuery = queryMock.bind(pool);

  await registerIncidentRoutes(app as any);

  const handler = app.postHandlers.get("/api/incidents");
  assert.ok(handler);

  const calls: unknown[][] = [];
  (pool.query as unknown as typeof queryMock) = (async (...args: unknown[]) => {
    calls.push(args);

    if (calls.length === 1) {
      return { rowCount: 1, rows: [{ "?column?": 1 }] };
    }

    if (calls.length === 2) {
      return { rowCount: 1, rows: [{ "?column?": 1 }] };
    }

    if (calls.length === 3) {
      return { rowCount: 0, rows: [] };
    }

    return { rowCount: 0, rows: [] };
  }) as typeof queryMock;

  try {
    const reply = createReplyDouble();
    const result = await handler?.(
      {
        ip: "127.0.0.1",
      body: {
        clientRequestId: "55555555-5555-4555-8555-555555555555",
        dialedPhone: "199",
        category: "fire",
          severity: "high",
          status: "open",
          latitude: 13.7478,
          longitude: 100.5351,
          provinceCode: "10",
          districtCode: "9999",
          reporterPhone: "0812345678",
          sessionId: "session-12345678",
        },
      },
      reply
    );

    assert.equal(reply.statusCode, 400);
    assert.equal(calls.length, 3);
    assert.deepEqual(result, {
      error: "Unknown district code",
      code: "UNKNOWN_DISTRICT_CODE",
      statusCode: 400,
    });
  } finally {
    (pool.query as unknown as typeof queryMock) = originalQuery as typeof queryMock;
  }
});

test("GET /api/incidents/history returns standardized validation error for invalid query", async () => {
  const app = createFakeApp();

  await registerIncidentRoutes(app as any);

  const handler = app.getHandlers.get("/api/incidents/history");
  assert.ok(handler);

  const reply = createReplyDouble();
  const result = await handler?.(
    {
      query: {
        sessionId: "short",
      },
    },
    reply
  );

  assert.equal(reply.statusCode, 400);
  assert.equal((result as any).code, "VALIDATION_ERROR");
  assert.equal((result as any).statusCode, 400);
  assert.ok(Array.isArray((result as any).issues));
});

test("PUT /api/incidents/:id/call updates call status and writes an audit log", async () => {
  const app = createFakeApp();
  const queryMock = pool.query as unknown as (...args: unknown[]) => Promise<{ rowCount?: number; rows: Record<string, unknown>[] }>;
  const originalQuery = queryMock.bind(pool);

  await registerIncidentRoutes(app as any);

  const handler = app.putHandlers.get("/api/incidents/:id/call");
  assert.ok(handler);

  const calls: unknown[][] = [];
  (pool.query as unknown as typeof queryMock) = (async (...args: unknown[]) => {
    calls.push(args);

    if (calls.length === 1) {
      return {
        rowCount: 1,
        rows: [
          {
            id: "incident-1",
            category: "medical",
            severity: "high",
            status: "open",
            description: "Reported via mobile app to EMS (connected)",
            agency_contact_id: "contact-ems-1",
            agency_name: "Emergency Medical Services",
            agency_phone: "1669",
            province_code: "10",
            province: "Bangkok",
            district_code: "1007",
            district: "Pathum Wan",
            accuracy: 15,
            call_status: "connected",
            reporter_phone: "0812345678",
            session_id: "session-12345678",
            latitude: 13.7478,
            longitude: 100.5351,
            marker_color: "#f97316",
            created_at: new Date("2026-06-13T00:00:00.000Z"),
            updated_at: new Date("2026-06-13T00:05:00.000Z"),
          },
        ],
      };
    }

    if (calls.length === 2) {
      return { rowCount: 1, rows: [] };
    }

    return { rowCount: 1, rows: [] };
  }) as typeof queryMock;

  try {
    const reply = createReplyDouble();
    const result = await handler?.(
      {
        id: "req-incident-call-update",
        log: { error() {} },
        params: { id: "incident-1" },
        body: {
          callStatus: "connected",
          reporterPhone: "0812345678",
          description: "Reported via mobile app to EMS (connected)",
        },
      },
      reply
    );

    assert.equal(reply.statusCode, 200);
    assert.equal(calls.length, 2);
    assert.match(String(calls[0]?.[0]), /UPDATE incidents/);
    assert.match(String(calls[1]?.[0]), /INSERT INTO audit_logs/);
    assert.deepEqual(result, {
      id: "incident-1",
      category: "medical",
      severity: "high",
      status: "open",
      description: "Reported via mobile app to EMS (connected)",
      agencyContactId: "contact-ems-1",
      agencyName: "Emergency Medical Services",
      agencyPhone: "1669",
      provinceCode: "10",
      province: "Bangkok",
      districtCode: "1007",
      district: "Pathum Wan",
      accuracy: 15,
      callStatus: "connected",
      reporterPhone: "0812345678",
      sessionId: "session-12345678",
      latitude: 13.7478,
      longitude: 100.5351,
      markerColor: "#f97316",
      areaId: undefined,
      areaName: undefined,
      areaColor: undefined,
      createdAt: new Date("2026-06-13T00:00:00.000Z"),
      updatedAt: new Date("2026-06-13T00:05:00.000Z"),
    });
  } finally {
    (pool.query as unknown as typeof queryMock) = originalQuery as typeof queryMock;
  }
});

test("PUT /api/incidents/:id/call returns 404 when incident is missing", async () => {
  const app = createFakeApp();
  const queryMock = pool.query as unknown as (...args: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
  const originalQuery = queryMock.bind(pool);

  await registerIncidentRoutes(app as any);

  const handler = app.putHandlers.get("/api/incidents/:id/call");
  assert.ok(handler);

  (pool.query as unknown as typeof queryMock) = (async () => ({ rows: [] })) as typeof queryMock;

  try {
    const reply = createReplyDouble();
    const result = await handler?.(
      {
        params: { id: "missing-incident" },
        body: { callStatus: "busy" },
      },
      reply
    );

    assert.equal(reply.statusCode, 404);
    assert.deepEqual(result, {
      error: "Incident not found",
      code: "INCIDENT_NOT_FOUND",
      statusCode: 404,
    });
  } finally {
    (pool.query as unknown as typeof queryMock) = originalQuery as typeof queryMock;
  }
});

test("PUT /api/incidents/:id/call updates incident even when agency contact is missing", async () => {
  const app = createFakeApp();
  const queryMock = pool.query as unknown as (...args: unknown[]) => Promise<{ rowCount?: number; rows: Record<string, unknown>[] }>;
  const originalQuery = queryMock.bind(pool);

  await registerIncidentRoutes(app as any);

  const handler = app.putHandlers.get("/api/incidents/:id/call");
  assert.ok(handler);

  const calls: unknown[][] = [];
  (pool.query as unknown as typeof queryMock) = (async (...args: unknown[]) => {
    calls.push(args);

    if (calls.length === 1) {
      return {
        rowCount: 1,
        rows: [
          {
            id: "incident-no-contact",
            category: "fire",
            severity: "critical",
            status: "open",
            description: "Reported via mobile app without mapped contact",
            agency_contact_id: null,
            agency_name: null,
            agency_phone: null,
            province_code: "65",
            province: "Phitsanulok",
            district_code: "6501",
            district: "Mueang Phitsanulok",
            accuracy: 12,
            call_status: "busy",
            reporter_phone: "0899999999",
            session_id: "session-87654321",
            latitude: 16.8211,
            longitude: 100.2659,
            marker_color: "#dc2626",
            created_at: new Date("2026-06-13T00:00:00.000Z"),
            updated_at: new Date("2026-06-13T00:03:00.000Z"),
          },
        ],
      };
    }

    if (calls.length === 2) {
      return { rowCount: 1, rows: [] };
    }

    return { rowCount: 1, rows: [] };
  }) as typeof queryMock;

  try {
    const reply = createReplyDouble();
    const result = await handler?.(
      {
        id: "req-incident-call-update-no-contact",
        log: { error() {} },
        params: { id: "incident-no-contact" },
        body: {
          callStatus: "busy",
          reporterPhone: "0899999999",
        },
      },
      reply
    );

    assert.equal(reply.statusCode, 200);
    assert.equal(calls.length, 2);
    assert.match(String(calls[0]?.[0]), /WITH updated_incident AS/);
    assert.deepEqual(result, {
      id: "incident-no-contact",
      category: "fire",
      severity: "critical",
      status: "open",
      description: "Reported via mobile app without mapped contact",
      agencyContactId: null,
      agencyName: null,
      agencyPhone: null,
      provinceCode: "65",
      province: "Phitsanulok",
      districtCode: "6501",
      district: "Mueang Phitsanulok",
      accuracy: 12,
      callStatus: "busy",
      reporterPhone: "0899999999",
      sessionId: "session-87654321",
      latitude: 16.8211,
      longitude: 100.2659,
      markerColor: "#dc2626",
      areaId: undefined,
      areaName: undefined,
      areaColor: undefined,
      createdAt: new Date("2026-06-13T00:00:00.000Z"),
      updatedAt: new Date("2026-06-13T00:03:00.000Z"),
    });
  } finally {
    (pool.query as unknown as typeof queryMock) = originalQuery as typeof queryMock;
  }
});


test("GET /api/reports/summary returns DB-backed report summary for super admin", async () => {
  const app = createFakeApp();
  const originalQuery = pool.query.bind(pool);
  const calls: Array<{ sql: string; values: unknown[] }> = [];

  await registerIncidentRoutes(app as any);
  const handler = app.getHandlers.get("/api/reports/summary");
  assert.ok(handler);

  (pool.query as any) = async (sql: string, values: unknown[] = []) => {
    calls.push({ sql, values });
    if (sql.includes("COUNT(*)::int AS total_incidents")) {
      return { rowCount: 1, rows: [{ total_incidents: 3, active_incidents: 2, closed_incidents: 1, connected_calls: 2 }] };
    }
    if (sql.includes("GROUP BY i.status")) {
      return { rowCount: 1, rows: [{ status: "reported", count: 2 }] };
    }
    if (sql.includes("GROUP BY i.category")) {
      return { rowCount: 1, rows: [{ category: "medical", count: 3 }] };
    }
    if (sql.includes("area_name")) {
      return { rowCount: 1, rows: [{ area_name: "Mueang Phitsanulok Phitsanulok", count: 3 }] };
    }
    return { rowCount: 1, rows: [{ bucket: "2026-06-27", count: 3, closed_count: 1 }] };
  };

  try {
    const result = await handler?.(
      {
        headers: { "x-admin-role": "super_admin" },
        query: { range: "month" },
      }
    ) as any;

    assert.equal(result.range, "month");
    assert.deepEqual(result.totals, {
      totalIncidents: 3,
      activeIncidents: 2,
      closedIncidents: 1,
      connectedCalls: 2,
    });
    assert.deepEqual(result.byCategory, [{ category: "medical", count: 3 }]);
    assert.equal(calls.length, 5);
    assert.equal(calls[0]?.values[0], "30 days");
  } finally {
    (pool.query as any) = originalQuery;
  }
});

test("GET /api/reports/summary scopes agency admin reports to their category", async () => {
  const app = createFakeApp();
  const originalQuery = pool.query.bind(pool);
  const calls: Array<{ sql: string; values: unknown[] }> = [];

  await registerIncidentRoutes(app as any);
  const handler = app.getHandlers.get("/api/reports/summary");
  assert.ok(handler);

  (pool.query as any) = async (sql: string, values: unknown[] = []) => {
    calls.push({ sql, values });
    if (sql.includes("COUNT(*)::int AS total_incidents")) {
      return { rowCount: 1, rows: [{ total_incidents: 1, active_incidents: 1, closed_incidents: 0, connected_calls: 1 }] };
    }
    return { rowCount: 0, rows: [] };
  };

  try {
    await handler?.(
      {
        headers: { "x-admin-role": "agency_admin", "x-admin-category": "medical" },
        query: { range: "week" },
      }
    );

    assert.match(calls[0]?.sql ?? "", /i\.category = \$2/);
    assert.deepEqual(calls[0]?.values, ["7 days", "medical"]);
  } finally {
    (pool.query as any) = originalQuery;
  }
});
